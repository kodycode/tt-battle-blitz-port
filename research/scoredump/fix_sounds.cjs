// Post-processing step for scoredump: re-export every sound member's complete MP3 stream.
//
// Every sound in this game is a Director "Shockwave Audio" compressed 'snd ' chunk: a Mac 'snd ' resource
// (format 2, one bufferCmd) with an extended sound header (encode 0xFF), followed by a 4-byte big-endian
// decoder skip and then plain MPEG-2 Layer III frames (22050 Hz mono, 32 kbit/s) up to the end of the
// chunk. The whole stream is in that one chunk (no ediM/media chunks; the extractor's raw_chunks/*_snd_.bin
// is complete).
//
// LibreShockwave's SoundConverter::extractMp3 sized every frame with the MPEG-1 formula 144*bitrate/rate.
// MPEG-2/2.5 Layer III frames hold 576 samples, so the real size is 72*bitrate/rate: the walker landed on
// every second frame header (2 x 104/105 bytes happens to equal one 209-byte "frame") and stopped at the
// first padding mismatch. It also skipped the stream's first (silent) frame. So every one of the 135 sounds
// was cut short: 27 at exactly 5224 bytes (all music, the ambient loops, the long sfx), the rest lost their
// first frame and a few tail frames.
//
// What Director plays (SWADCmpr.x32, the SWA Decompression Xtra, FUN_6d341c25/FUN_6d341b29): it decodes the
// frames with its Fraunhofer decoder, drops the first `skip` samples of decoder output (the 4-byte value,
// 1500 for every sound here) and the sound is numFrames samples long (extended header numFrames; the
// header's sampleRate Fixed is 22050). The cupt "Loop end" cue points of music_loop2..5 equal exactly
// numFrames / 22050 s, which confirms that length.
//
// This script writes all MPEG frames of each chunk unchanged (bit-exact, no re-encoding) to public/<url>
// and adds to each sound member in casts.json:
//   sampleRate   22050 (header)
//   sampleCount  numFrames: Director's length of the sound in samples (duration = sampleCount / sampleRate)
//   skipSamples  decoder samples Director drops before sample 0 (1500)
//   mpegSamples  samples the MP3 decodes to (frames * 576): the play region is [skipSamples,
//                skipSamples + sampleCount) of the decoded MP3; the runtime (src/runtime/audio.ts) plays
//                and loops exactly that region.
//   cuePoints    [{time (ms), name}] when the member has a cupt chunk (informational; Director loops the
//                whole sound, cue points are not loop points).
// The snd header loopStart/loopEnd are 0 for every sound (no loop points); `loop` (member flag) is unchanged.
//
// Usage (from the repo root, after scoredump):  node research/scoredump/fix_sounds.cjs [--check]
// Reads public/data/casts.json and local/assets/<file>/manifest.tsv + raw_chunks/*_snd_.bin. --check only reports.
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const castsPath = path.join(root, 'public/data/casts.json');
const casts = JSON.parse(fs.readFileSync(castsPath, 'utf8'));
const checkOnly = process.argv.includes('--check');

const manifests = new Map();
function chunkPath(dir, memberId, fourcc) {
  if (!manifests.has(dir)) {
    const m = new Map();
    for (const line of fs.readFileSync(path.join(root, 'local', 'assets', dir, 'manifest.tsv'), 'utf8').split(/\r?\n/).slice(1)) {
      const f = line.split('\t');
      if (f.length >= 7 && f[6].startsWith('raw_chunks/')) m.set(`${f[0]}:${f[5]}`, f[6]);
    }
    manifests.set(dir, m);
  }
  const rel = manifests.get(dir).get(`${memberId}:${fourcc}`);
  return rel ? path.join(root, 'local', 'assets', dir, rel) : null;
}

// Mac 'snd ' resource -> sound header fields + offset of the sample data.
function parseSnd(b) {
  const fmt = b.readUInt16BE(0);
  let p;
  if (fmt === 1) {
    const nMods = b.readUInt16BE(2);
    p = 4 + nMods * 6;
  } else if (fmt === 2) p = 4;
  else throw new Error(`snd format ${fmt}`);
  const nCmds = b.readUInt16BE(p);
  p += 2;
  let hdr = -1;
  for (let i = 0; i < nCmds; i++, p += 8) {
    const cmd = b.readUInt16BE(p);
    if ((cmd & 0x7fff) === 0x51 || (cmd & 0x7fff) === 0x50) hdr = b.readUInt32BE(p + 4); // bufferCmd/soundCmd
  }
  if (hdr < 0) throw new Error('no bufferCmd');
  const h = {
    numChannels: b.readUInt32BE(hdr + 4),
    sampleRate: b.readUInt32BE(hdr + 8) / 65536,
    loopStart: b.readUInt32BE(hdr + 12),
    loopEnd: b.readUInt32BE(hdr + 16),
    encode: b[hdr + 20],
  };
  if (h.encode !== 0xff) throw new Error(`snd encode 0x${h.encode.toString(16)} (only extended headers here)`);
  h.numFrames = b.readUInt32BE(hdr + 22);
  h.sampleSize = b.readUInt16BE(hdr + 48);
  h.dataOffset = hdr + 64;
  return h;
}

const BITRATES = {
  v1: [[], [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]],
  v2: [[], [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]],
};
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

// Walks MPEG audio frames from `pos`; returns {frames, samples, end, rate, channels}.
function walkFrames(b, pos) {
  let frames = 0;
  let samples = 0;
  let rate = 0;
  let channels = 0;
  while (pos + 4 <= b.length) {
    const h = b.readUInt32BE(pos);
    if (h >>> 21 !== 0x7ff) break;
    const ver = (h >>> 19) & 3; // 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5
    const layerBits = (h >>> 17) & 3; // 3 = Layer I, 2 = II, 1 = III
    const bri = (h >>> 12) & 15;
    const sri = (h >>> 10) & 3;
    const pad = (h >>> 9) & 1;
    if (ver === 1 || layerBits === 0 || bri === 0 || bri === 15 || sri === 3) break;
    const layer = 4 - layerBits;
    const br = BITRATES[ver === 3 ? 'v1' : 'v2'][layer][bri] * 1000;
    const sr = RATES[ver][sri];
    let size;
    let spf;
    if (layer === 1) {
      size = (Math.floor((12 * br) / sr) + pad) * 4;
      spf = 384;
    } else if (layer === 2 || ver === 3) {
      size = Math.floor((144 * br) / sr) + pad;
      spf = 1152;
    } else {
      size = Math.floor((72 * br) / sr) + pad; // MPEG-2/2.5 Layer III: 576 samples per frame
      spf = 576;
    }
    if (pos + size > b.length) break;
    if (rate && sr !== rate) break;
    rate = sr;
    channels = ((h >>> 6) & 3) === 3 ? 1 : 2;
    frames++;
    samples += spf;
    pos += size;
  }
  return { frames, samples, end: pos, rate, channels };
}

function parseCues(b) {
  const n = b.readUInt32BE(0);
  const cues = [];
  for (let i = 0; i < n && 4 + i * 36 + 36 <= b.length; i++) {
    const o = 4 + i * 36;
    const len = b[o + 4];
    cues.push({ time: b.readUInt32BE(o), name: b.toString('latin1', o + 5, o + 5 + len) });
  }
  return cues;
}

let rewritten = 0;
let unchanged = 0;
let wasShort = 0;
let patched = 0;
const errors = [];
for (const cl of casts.castLibs) {
  const dir = cl.fileName ? cl.fileName.replace(/\.(cct|cst)$/i, '') : 'game';
  for (const m of cl.members) {
    if (m.type !== 'sound' || !m.url) continue;
    const label = `${cl.name} ${m.number} ${m.name}`;
    const file = chunkPath(dir, m.chunkId, 'snd ');
    if (!file) {
      errors.push(`${label}: no snd chunk in local/assets/${dir}/manifest.tsv`);
      continue;
    }
    const b = fs.readFileSync(file);
    let h;
    try {
      h = parseSnd(b);
    } catch (e) {
      errors.push(`${label}: ${e.message}`);
      continue;
    }
    const skip = b.readUInt32BE(h.dataOffset);
    const start = h.dataOffset + 4;
    const w = walkFrames(b, start);
    // Every byte after the 4-byte skip must be MPEG frames, and they must cover skip + numFrames samples.
    if (w.frames === 0 || w.end !== b.length || w.rate !== h.sampleRate || w.channels !== h.numChannels ||
        w.samples < skip + h.numFrames || h.loopStart !== 0 || h.loopEnd !== 0) {
      errors.push(`${label}: unexpected stream (frames ${w.frames}, end ${w.end}/${b.length}, rate ${w.rate}/${h.sampleRate}, ` +
        `channels ${w.channels}/${h.numChannels}, samples ${w.samples} < ${skip}+${h.numFrames}?, loop ${h.loopStart}-${h.loopEnd})`);
      continue;
    }
    const mp3 = b.subarray(start, w.end);
    const target = path.join(root, 'public', m.url);
    const cur = fs.existsSync(target) ? fs.readFileSync(target) : Buffer.alloc(0);
    if (!cur.equals(mp3)) {
      const old = walkFrames(cur, 0);
      if (old.samples < w.samples) wasShort++;
      rewritten++;
      console.log(`${checkOnly ? 'differs' : 'rewritten'}: ${label}: ${cur.length} -> ${mp3.length} bytes, ` +
        `${old.frames} -> ${w.frames} frames, plays ${(h.numFrames / h.sampleRate).toFixed(3)} s`);
      if (!checkOnly) fs.writeFileSync(target, mp3);
    } else unchanged++;

    const info = { sampleRate: h.sampleRate, sampleCount: h.numFrames, skipSamples: skip, mpegSamples: w.samples };
    const cupt = chunkPath(dir, m.chunkId, 'cupt');
    if (cupt) {
      const cues = parseCues(fs.readFileSync(cupt));
      if (cues.length) info.cuePoints = cues;
    }
    let changed = false;
    for (const [k, v] of Object.entries(info)) {
      if (JSON.stringify(m[k]) !== JSON.stringify(v)) {
        m[k] = v;
        changed = true;
      }
    }
    if (changed) patched++;
  }
}

if (patched && !checkOnly) {
  // casts.json keeps one member per line: rewrite only the affected lines (same approach as fix_4bit_bitmaps.cjs).
  const lines = fs.readFileSync(castsPath, 'utf8').split('\n');
  let libNumber = 0;
  for (let i = 0; i < lines.length; i++) {
    const lm = /^ {3}"number":(\d+),\s*$/.exec(lines[i]);
    if (lm) libNumber = Number(lm[1]);
    const t = lines[i].trim();
    if (!t.startsWith('{"number":')) continue;
    const comma = t.endsWith(',');
    const old = JSON.parse(comma ? t.slice(0, -1) : t);
    if (old.type !== 'sound') continue;
    const cur = casts.castLibs.find((c) => c.number === libNumber)?.members.find((x) => x.number === old.number);
    if (!cur) continue;
    const s = JSON.stringify(cur);
    if (s !== JSON.stringify(old)) lines[i] = lines[i].slice(0, lines[i].indexOf('{')) + s + (comma ? ',' : '');
  }
  fs.writeFileSync(castsPath, lines.join('\n'));
}
for (const e of errors) console.warn(`ERROR ${e}`);
console.log(`sounds: ${rewritten} ${checkOnly ? 'differ' : 'rewritten'} (${wasShort} were truncated), ${unchanged} already complete, ` +
  `${patched} casts.json members ${checkOnly ? 'need' : 'got'} sampleCount/skipSamples, ${errors.length} errors`);
if (errors.length) process.exitCode = 1;
