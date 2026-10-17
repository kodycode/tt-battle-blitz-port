import { Member, LList } from '../runtime';
import { Class_Animation } from './Class_Animation';

export class Class_ManualAnimation extends Class_Animation {
  constructor(memList?: LList<Member>) {
    super(memList);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  advance(): void {}

  // Faithful to the original: only sets the index when i is PAST the end of the list (an original bug).
  setIndex(i: number): void {
    if (i > this.animList.count) this.currIndex = i;
  }

  getIndex(): number {
    return this.currIndex;
  }
}
