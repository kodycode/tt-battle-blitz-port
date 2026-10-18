import { Member, LList } from '../../runtime';
import { Class_Animation } from './Class_Animation';

export class Class_PlayOnceAnimation extends Class_Animation {
  constructor(memList?: LList<Member>) {
    super(memList);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  advance(): void {
    if (!this.done) {
      this.repeatCount = this.repeatCount - 1;
      if (this.repeatCount < 0) this.repeatCount = 0;
      if (this.repeatCount === 0) {
        if (this.currIndex === this.animList.count) {
          this.done = 1;
        } else {
          this.currIndex = this.currIndex + 1;
          this.repeatCount = this.frameRepeat;
        }
      }
    }
  }
}
