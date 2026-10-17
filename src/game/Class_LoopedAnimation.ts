import { Member, LList } from '../runtime';
import { Class_Animation } from './Class_Animation';

export class Class_LoopedAnimation extends Class_Animation {
  constructor(memList?: LList<Member>) {
    super(memList);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  advance(): void {
    this.repeatCount = this.repeatCount - 1;
    if (this.repeatCount === 0) {
      this.currIndex = this.currIndex + 1;
      if (this.currIndex > this.animList.count) this.reset();
      this.repeatCount = this.frameRepeat;
    }
  }
}
