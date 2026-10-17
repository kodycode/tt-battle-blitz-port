import { Member, LList, MEMBER_EMPTY, listp } from '../runtime';

// Base animation. currIndex is 1-based into animList, as in Lingo.
export class Class_Animation {
  animList: LList<Member>;
  currIndex: number;
  repeatCount: number;
  frameRepeat: number;
  done: number;

  constructor(memList?: LList<Member>) {
    this.animList = listp(memList) ? (memList as LList<Member>) : new LList<Member>();
    this.currIndex = 1;
    this.frameRepeat = 1;
    this.repeatCount = this.frameRepeat;
    this.done = 0;
  }

  destroy(): undefined {
    return undefined;
  }

  setRepeat(i: number): void {
    this.frameRepeat = i;
    this.repeatCount = i;
  }

  setMembers(l: LList<Member>): void {
    if (listp(l)) {
      this.animList = l;
      this.reset();
    }
  }

  reset(): void {
    this.currIndex = 1;
    this.done = 0;
  }

  advance(): void {}

  getMember(): Member {
    if (this.animList.count === 0) return MEMBER_EMPTY;
    return this.animList.get(this.currIndex);
  }

  isDone(): number {
    return this.done;
  }
}
