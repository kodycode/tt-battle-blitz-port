import { g, Member, Point } from '../../runtime';
import { Class_Actor } from './Class_Actor';

export class Class_StaticActor extends Class_Actor {
  constructor(initMember: Member, initLocZ: number, initPos: Point, initVel: Point, initDir: number) {
    super(initPos, initVel, initDir);
    this.visSprite = g.game.spriteMgr.grabSprite();
    this.visSprite.member = initMember;
    this.visSprite.locZ = initLocZ;
    this.visSprite.flipH = initDir < 0;
    this.visSprite.ink = g.INK_BGTRANSPARENT;
  }

  destroy(): undefined {
    g.game.spriteMgr.releaseSprite(this.visSprite);
    return undefined;
  }
}
