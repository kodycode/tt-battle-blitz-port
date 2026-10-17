// Sound play region: Director drops skipSamples decoded samples and plays sampleCount (docs/DATA_FORMAT.md, type = sound).
import { describe, expect, it } from 'vitest';
import { soundPlayRegion, soundDurationMs } from '../src/runtime/audio';
import { Member } from '../src/runtime/member';

// audio/56 music_whole_song (casts.json)
const song = { sampleRate: 22050, sampleCount: 706188, skipSamples: 1500, mpegSamples: 709632 };

describe('soundPlayRegion', () => {
  it('plays [skip, skip + count) of an untrimmed decode', () => {
    const r = soundPlayRegion(song, 709632 / 22050);
    expect(r.offset).toBeCloseTo(1500 / 22050, 9);
    expect(r.duration).toBeCloseTo(706188 / 22050, 9);
  });
  it('tolerates resampling to the context rate', () => {
    const len48k = Math.round((709632 * 48000) / 22050);
    const r = soundPlayRegion(song, len48k / 48000);
    expect(r.offset).toBeCloseTo(1500 / 22050, 9);
    expect(r.duration).toBeCloseTo(706188 / 22050, 9);
  });
  it('shifts the start when a decoder already trimmed its delay', () => {
    const r = soundPlayRegion(song, (709632 - 529) / 22050);
    expect(r.offset).toBeCloseTo((1500 - 529) / 22050, 9);
    expect(r.duration).toBeCloseTo(706188 / 22050, 9);
  });
  it('plays the whole buffer without region data', () => {
    expect(soundPlayRegion(null, 1.25)).toEqual({ offset: 0, duration: 1.25 });
  });
});

describe('soundDurationMs', () => {
  it('uses the header length', () => {
    const m = new Member(56, 8, 'music_whole_song', 'sound');
    m.soundRegion = song;
    expect(soundDurationMs(m)).toBeCloseTo((706188 * 1000) / 22050, 6);
  });
});
