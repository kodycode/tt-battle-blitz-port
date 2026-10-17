// Director sound channels on Web Audio. sound(n).play(member), .stop(), .volume (0-255), .isBusy().
import { Member, SoundRegion } from './member';

// Where Director's sound lies inside a decoded buffer, in seconds. Director (SWA Decompression Xtra) drops the
// first skipSamples decoded samples and plays sampleCount samples. The MP3s hold every frame untrimmed, so a
// decoder returns mpegSamples; if one returns fewer (it trimmed decoder delay itself), assume the shortfall
// came off the front. Loops repeat exactly [offset, offset + duration).
export function soundPlayRegion(r: SoundRegion | null, bufferDuration: number): { offset: number; duration: number } {
  if (!r || !(r.sampleRate > 0) || !(r.sampleCount > 0)) return { offset: 0, duration: bufferDuration };
  const decoded = Math.round(bufferDuration * r.sampleRate);
  const dropped = r.mpegSamples - decoded > 2 ? r.mpegSamples - decoded : 0; // resampling may round by a sample
  const start = Math.max(0, r.skipSamples - dropped);
  const count = Math.max(0, Math.min(r.sampleCount, decoded - start));
  return { offset: start / r.sampleRate, duration: count / r.sampleRate };
}

// Director's duration of a sound member in ms (header length), else the decoded buffer's.
export function soundDurationMs(m: Member): number {
  const r = m.soundRegion;
  if (r && r.sampleRate > 0 && r.sampleCount > 0) return (r.sampleCount * 1000) / r.sampleRate;
  return m.sound ? m.sound.duration * 1000 : 0;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const pending = new Map<string, Promise<AudioBuffer | null>>();

// Oracle test mode (?test=1): sounds are not played; channel busy state follows the virtual game clock
// (theMilliseconds) and the member's header duration (soundDurationMs), so runs are deterministic.
let virtualClock: (() => number) | null = null;
export function setAudioVirtualClock(fn: (() => number) | null): void {
  virtualClock = fn;
}

export function audioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  return ctx;
}

// Browsers keep audio suspended until a user gesture.
export function resumeAudio(): void {
  const c = audioContext();
  if (c.state === 'suspended') void c.resume();
}

export function setMasterVolume(v: number): void {
  audioContext();
  master!.gain.value = v;
}

// Where sound files' bytes come from (main.ts points this at its data source); default: fetch by URL.
let soundBytes: (url: string) => Promise<ArrayBuffer> = async (url) => (await fetch(url)).arrayBuffer();
export function setSoundLoader(fn: (url: string) => Promise<ArrayBuffer>): void {
  soundBytes = fn;
}

export function loadSound(m: Member): Promise<AudioBuffer | null> {
  if (m.sound) return Promise.resolve(m.sound);
  if (!m.url) return Promise.resolve(null);
  let p = pending.get(m.url);
  if (!p) {
    p = soundBytes(m.url)
      .then((b) => audioContext().decodeAudioData(b))
      .catch(() => null);
    pending.set(m.url, p);
  }
  return p.then((buf) => {
    m.sound = buf;
    return buf;
  });
}

export class SoundChannel {
  readonly number: number;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private busyUntil = 0; // performance.now() ms; Infinity for loops
  private playToken = 0;
  private _volume = 255;
  member: Member | null = null;

  constructor(n: number) {
    this.number = n;
  }

  get volume(): number {
    return this._volume;
  }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(255, v));
    if (this.gain) this.gain.gain.value = this._volume / 255;
  }

  play(m: Member): void {
    this.stop();
    if (!m || m.type !== 'sound') return;
    this.member = m;
    if (virtualClock) {
      this.busyUntil = m.loop ? Infinity : virtualClock() + (m.sound || m.soundRegion ? soundDurationMs(m) : 0);
      return;
    }
    const token = ++this.playToken;
    const start = (buf: AudioBuffer | null) => {
      if (!buf || token !== this.playToken) return;
      const c = audioContext();
      const src = c.createBufferSource();
      src.buffer = buf;
      const { offset, duration } = soundPlayRegion(m.soundRegion, buf.duration);
      src.loop = m.loop;
      if (m.loop) {
        src.loopStart = offset;
        src.loopEnd = offset + duration;
      }
      const g = c.createGain();
      g.gain.value = this._volume / 255;
      src.connect(g);
      g.connect(master!);
      if (m.loop) src.start(0, offset);
      else src.start(0, offset, duration);
      this.source = src;
      this.gain = g;
      this.busyUntil = m.loop ? Infinity : performance.now() + duration * 1000;
      src.onended = () => {
        if (token === this.playToken) this.busyUntil = 0;
      };
    };
    // Count as busy immediately so the audio manager does not reclaim the channel while decoding.
    this.busyUntil = m.loop ? Infinity : performance.now() + 60000;
    if (m.sound) start(m.sound);
    else
      void loadSound(m).then((buf) => {
        if (!buf && token === this.playToken) this.busyUntil = 0;
        start(buf);
      });
  }

  stop(): void {
    this.playToken++;
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // already stopped
      }
      this.source.disconnect();
    }
    this.gain?.disconnect();
    this.source = null;
    this.gain = null;
    this.busyUntil = 0;
    this.member = null;
  }

  isBusy(): boolean {
    return (virtualClock ? virtualClock() : performance.now()) < this.busyUntil;
  }
}

const channels: SoundChannel[] = [];
for (let i = 0; i <= 8; i++) channels.push(new SoundChannel(i));

export function sound(n: number): SoundChannel {
  return channels[n] || channels[0];
}

export function stopAllChannels(): void {
  for (const c of channels) c.stop();
}
