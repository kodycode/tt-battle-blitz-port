import { g, theFrame, PASS, Behavior } from '../runtime';

export class Frame_LoopHere extends Behavior {
  exitFrame(): unknown {
    if (!g.goFrame) {
      g.goFrame = theFrame();
    }
    return PASS;
  }
}
