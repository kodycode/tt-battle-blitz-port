// Sound members: Shockwave Audio 'snd ' chunks -> the complete MPEG audio stream, plus cue points (cupt).
//
// Each 'snd ' chunk is a Mac sound resource (format 1 or 2) whose bufferCmd/soundCmd points at an extended
// sound header (encode 0xFF: u32 numFrames at +22 = length in samples, Fixed sampleRate at +8), followed at
// header + 64 by a big-endian u32 decoder skip (samples Director drops from the decoder output) and then plain
// MPEG audio frames up to the end of the chunk. See docs/DATA_FORMAT.md (type = sound).
import { be16, beu32, latin1 } from './bytes';

export type SoundHeader = {
  numChannels: number;
  sampleRate: number;
  loopStart: number;
  loopEnd: number;
  encode: number;
  numFrames: number;
  dataOffset: number;
};

export function parseSndHeader(b: Uint8Array): SoundHeader {
  const fmt = be16(b, 0);
  let p: number;
  if (fmt === 1) p = 4 + be16(b, 2) * 6;
  else if (fmt === 2) p = 4;
  else throw new Error(`snd format ${fmt}`);
  const nCmds = be16(b, p);
  p += 2;
  let hdr = -1;
  for (let i = 0; i < nCmds; i++, p += 8) {
    const cmd = be16(b, p) & 0x7fff;
    if (cmd === 0x51 || cmd === 0x50) hdr = beu32(b, p + 4);
  }
  if (hdr < 0) throw new Error('no bufferCmd');
  const encode = b[hdr + 20];
  if (encode !== 0xff) throw new Error(`snd encode 0x${encode.toString(16)}`);
  return {
    numChannels: beu32(b, hdr + 4),
    sampleRate: beu32(b, hdr + 8) / 65536,
    loopStart: beu32(b, hdr + 12),
    loopEnd: beu32(b, hdr + 16),
    encode,
    numFrames: beu32(b, hdr + 22),
    dataOffset: hdr + 64,
  };
}

const BITRATES_V1 = [
  [],
  [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
];
const BITRATES_V2 = [
  [],
  [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
];
const RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** Walks MPEG audio frames from `pos` (standard header sizes: MPEG-2/2.5 Layer III frames are 72 * br / sr). */
export function walkMpegFrames(b: Uint8Array, pos: number) {
  let frames = 0;
  let samples = 0;
  let rate = 0;
  let channels = 0;
  while (pos + 4 <= b.length) {
    const h = beu32(b, pos);
    if (h >>> 21 !== 0x7ff) break;
    const ver = (h >>> 19) & 3;
    const layerBits = (h >>> 17) & 3;
    const bri = (h >>> 12) & 15;
    const sri = (h >>> 10) & 3;
    const pad = (h >>> 9) & 1;
    if (ver === 1 || layerBits === 0 || bri === 0 || bri === 15 || sri === 3) break;
    const layer = 4 - layerBits;
    const br = (ver === 3 ? BITRATES_V1 : BITRATES_V2)[layer][bri] * 1000;
    const sr = RATES[ver][sri];
    let size: number;
    let spf: number;
    if (layer === 1) {
      size = (Math.floor((12 * br) / sr) + pad) * 4;
      spf = 384;
    } else if (layer === 2 || ver === 3) {
      size = Math.floor((144 * br) / sr) + pad;
      spf = 1152;
    } else {
      size = Math.floor((72 * br) / sr) + pad;
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

export type CuePoint = { time: number; name: string };

/** cupt: u32 count, then 36-byte entries {u32 time (ms), Pascal name (31 bytes)}. */
export function parseCues(b: Uint8Array): CuePoint[] {
  const n = beu32(b, 0);
  const cues: CuePoint[] = [];
  for (let i = 0; i < n && 4 + i * 36 + 36 <= b.length; i++) {
    const o = 4 + i * 36;
    const len = b[o + 4];
    cues.push({ time: beu32(b, o), name: latin1(b, o + 5, o + 5 + len) });
  }
  return cues;
}

export type ExtractedSound = {
  mp3: Uint8Array;
  sampleRate: number;
  sampleCount: number;
  skipSamples: number;
  mpegSamples: number;
};

export function extractSound(snd: Uint8Array): ExtractedSound {
  const h = parseSndHeader(snd);
  const skip = beu32(snd, h.dataOffset);
  const start = h.dataOffset + 4;
  const w = walkMpegFrames(snd, start);
  if (w.frames === 0 || w.end !== snd.length || w.rate !== h.sampleRate || w.channels !== h.numChannels ||
      w.samples < skip + h.numFrames || h.loopStart !== 0 || h.loopEnd !== 0) {
    throw new Error(`unexpected sound stream (frames ${w.frames}, end ${w.end}/${snd.length}, rate ${w.rate}/${h.sampleRate})`);
  }
  return { mp3: snd.slice(start, w.end), sampleRate: h.sampleRate, sampleCount: h.numFrames, skipSamples: skip, mpegSamples: w.samples };
}
