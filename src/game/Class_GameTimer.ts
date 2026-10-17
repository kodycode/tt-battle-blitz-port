import { g, idiv } from '../runtime';

export class Class_GameTimer {
  initTime: number;
  currTime: number;
  frames: number;

  constructor(i: number) {
    this.initTime = i;
    this.currTime = this.initTime;
    this.frames = 0;
  }

  destroy(): undefined {
    return undefined;
  }

  // The Lingo declares a parameter named initTime, but the bytecode reads the property (getprop), so the
  // argument is ignored and the clock always resets to the round duration.
  reset(_initTime?: number): void {
    this.currTime = this.initTime;
    this.frames = 0;
  }

  update(): void {
    this.frames = this.frames + 1;
    // Integer division: whole seconds.
    this.currTime = this.initTime - idiv(this.frames, g.FRAME_RATE);
    if (this.currTime < 0) this.currTime = 0;
  }

  getTime(): number {
    return this.currTime;
  }
}
