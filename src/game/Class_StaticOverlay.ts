import { Member, Point } from '../runtime';
import { Class_Overlay } from './Class_Overlay';

export class Class_StaticOverlay extends Class_Overlay {
  constructor(initMember: Member, initPos: Point, initLocZ: number) {
    super(initPos, initLocZ);
    this.setMember(initMember);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  update(): void {}
}
