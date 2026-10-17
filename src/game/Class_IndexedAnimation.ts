import { Member, LList } from '../runtime';
import { Class_Animation } from './Class_Animation';

// Plays animList entries in the order given by `order` (1-based indices into animList).
export class Class_IndexedAnimation extends Class_Animation {
  order: LList<number>;
  orderIndex: number;

  constructor(memList: LList<Member>, orderList: LList<number>) {
    super(memList);
    this.order = orderList;
    this.orderIndex = 1;
    this.currIndex = this.order.get(this.orderIndex);
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
        if (this.orderIndex === this.order.count) {
          this.done = 1;
        } else {
          this.orderIndex = this.orderIndex + 1;
          this.currIndex = this.order.get(this.orderIndex);
          this.repeatCount = this.frameRepeat;
        }
      }
    }
  }

  reset(): void {
    super.reset();
    this.orderIndex = 1;
    this.currIndex = this.order.get(this.orderIndex);
  }
}
