import { g, LList, Member, sound, integer, idiv, voidp, integerp, b2i } from '../runtime';

// Sound channels 1..8 with priorities, event IDs and per-frame volume fades. Volumes are 0-100.
export class Class_AudioManager {
  CHANNEL_COUNT: number;
  FADE_NONE: number;
  FADE_IN: number;
  FADE_OUT: number;
  eventCounter: number;
  channelEventIDs: LList<number>;
  channelMembers: LList<Member | undefined>;
  channelVolumes: LList<number>;
  channelPriorities: LList<number>;
  channelFadeDirections: LList<number>;
  channelFadeDurations: LList<number>;
  channelFadeStartVolumes: LList<number>;
  channelFadeEndVolumes: LList<number>;

  constructor() {
    this.CHANNEL_COUNT = 8;
    this.FADE_NONE = 0;
    this.FADE_IN = 1;
    this.FADE_OUT = 2;
    this.eventCounter = 0;
    this.channelEventIDs = g.util.newArray(this.CHANNEL_COUNT, 0);
    this.channelMembers = g.util.newArray<Member | undefined>(this.CHANNEL_COUNT, undefined);
    this.channelVolumes = g.util.newArray(this.CHANNEL_COUNT, 0);
    this.channelPriorities = g.util.newArray(this.CHANNEL_COUNT, 0);
    this.channelFadeDirections = g.util.newArray(this.CHANNEL_COUNT, this.FADE_NONE);
    this.channelFadeDurations = g.util.newArray(this.CHANNEL_COUNT, 0);
    this.channelFadeStartVolumes = g.util.newArray(this.CHANNEL_COUNT, 0);
    this.channelFadeEndVolumes = g.util.newArray(this.CHANNEL_COUNT, 0);
    for (let i = 1; i <= this.CHANNEL_COUNT; i++) this.clearChannel(i);
  }

  destroy(): undefined {
    return undefined;
  }

  clearChannel(chan: number): void {
    sound(chan).stop();
    this.channelEventIDs.set(chan, 0);
    this.channelMembers.set(chan, undefined);
    this.channelVolumes.set(chan, 0);
    this.channelPriorities.set(chan, 0);
    this.channelFadeDirections.set(chan, this.FADE_NONE);
    this.channelFadeDurations.set(chan, 0);
    this.channelFadeStartVolumes.set(chan, 0);
    this.channelFadeEndVolumes.set(chan, 0);
  }

  playInChannel(mem: Member, chan: number, vol: number, pri: number): void {
    this.channelVolumes.set(chan, vol);
    this.channelMembers.set(chan, mem);
    this.channelPriorities.set(chan, pri);
    this.setChannelVolume(chan, vol);
    sound(chan).play(mem);
  }

  setChannelVolume(chan: number, vol: number): void {
    this.channelVolumes.set(chan, vol);
    sound(chan).volume = integer(vol * 2.55);
  }

  update(): void {
    for (let i = 1; i <= this.CHANNEL_COUNT; i++) {
      if (this.channelEventIDs.get(i)) {
        if (this.channelFadeDirections.get(i) === this.FADE_IN) {
          // Integer division: volumes and durations are integers.
          let vol = this.channelVolumes.get(i) + integer(idiv(this.channelFadeEndVolumes.get(i) - this.channelFadeStartVolumes.get(i), this.channelFadeDurations.get(i)));
          // ORIGINAL BUG: should be `>`; a fade-in snaps to the end volume on its first step.
          if (vol < this.channelFadeEndVolumes.get(i)) vol = this.channelFadeEndVolumes.get(i);
          this.setChannelVolume(i, vol);
          if (vol === this.channelFadeEndVolumes.get(i)) {
            this.channelFadeDirections.set(i, this.FADE_NONE);
            this.channelFadeDurations.set(i, 0);
            this.channelFadeStartVolumes.set(i, 0);
            this.channelFadeEndVolumes.set(i, 0);
          }
        } else if (this.channelFadeDirections.get(i) === this.FADE_OUT) {
          let vol = this.channelVolumes.get(i) - integer(idiv(this.channelFadeStartVolumes.get(i) - this.channelFadeEndVolumes.get(i), this.channelFadeDurations.get(i)));
          if (vol < this.channelFadeEndVolumes.get(i)) vol = this.channelFadeEndVolumes.get(i);
          this.setChannelVolume(i, vol);
          if (vol === this.channelFadeEndVolumes.get(i)) {
            if (vol === 0) {
              this.clearChannel(i);
            } else {
              this.channelFadeDirections.set(i, this.FADE_NONE);
              this.channelFadeDurations.set(i, 0);
              this.channelFadeStartVolumes.set(i, 0);
              this.channelFadeEndVolumes.set(i, 0);
            }
          }
        }
        if (!sound(i).isBusy()) this.clearChannel(i);
      }
    }
  }

  playSound(mem: Member | undefined, vol?: number, pri?: number): number | undefined {
    if (voidp(mem)) return undefined;
    if (voidp(vol)) vol = 100;
    if (voidp(pri)) pri = g.SFX_EVENT_PRIORITY_NONE;
    let chan = 0;
    for (let i = 1; i <= this.CHANNEL_COUNT; i++) {
      if (voidp(this.channelMembers.get(i))) {
        chan = i;
        break;
      }
      if ((pri as number) > this.channelPriorities.get(i)) {
        if (chan > 0) {
          if (this.channelPriorities.get(i) < this.channelPriorities.get(chan)) chan = i;
          continue;
        }
        chan = i;
      }
    }
    if (chan) {
      this.eventCounter = this.eventCounter + 1;
      this.clearChannel(chan);
      this.playInChannel(mem as Member, chan, vol as number, pri as number);
      this.channelEventIDs.set(chan, this.eventCounter);
      return this.eventCounter;
    }
    return 0;
  }

  // arg: an event ID (integer) or a sound member.
  stopSound(arg: any): void {
    let i: number;
    if (integerp(arg)) i = this.channelEventIDs.getPos(arg);
    else i = this.channelMembers.getPos(arg);
    if (!i) return;
    this.clearChannel(i);
  }

  stopAllSounds(): void {
    for (let i = 1; i <= this.CHANNEL_COUNT; i++) this.clearChannel(i);
  }

  isPlaying(arg: any): number {
    if (integerp(arg)) return b2i(this.channelEventIDs.getPos(arg) !== 0);
    return b2i(this.channelMembers.getPos(arg) !== 0);
  }

  fadeOutSound(arg: any, endVol: number, dur: number): void {
    let chan: number;
    if (integerp(arg)) chan = this.channelEventIDs.getPos(arg);
    else chan = this.channelMembers.getPos(arg);
    if (!chan) return;
    const startVol = this.channelVolumes.get(chan);
    if (endVol >= startVol) return;
    this.channelFadeStartVolumes.set(chan, startVol);
    this.channelFadeEndVolumes.set(chan, endVol);
    this.channelFadeDirections.set(chan, this.FADE_OUT);
    this.channelFadeDurations.set(chan, integer(dur * g.FRAME_RATE));
  }

  fadeInEvent(arg: any, endVol: number, dur: number): void {
    let chan: number;
    if (integerp(arg)) chan = this.channelEventIDs.getPos(arg);
    else chan = this.channelMembers.getPos(arg);
    if (!chan) return;
    const startVol = this.channelVolumes.get(chan);
    if (endVol <= startVol) return;
    this.channelFadeStartVolumes.set(chan, startVol);
    this.channelFadeEndVolumes.set(chan, endVol);
    this.channelFadeDirections.set(chan, this.FADE_IN);
    this.channelFadeDurations.set(chan, integer(dur * g.FRAME_RATE));
  }

  getEventID(mem: Member): number {
    const i = this.channelMembers.getPos(mem);
    if (i) return this.channelEventIDs.get(i);
    return 0;
  }
}
