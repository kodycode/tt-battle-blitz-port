import { g, list, Point } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_CyborgDiagLinesEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.CHAR_SHARED;
    const vis = list(A.FX_CYBORG_LINES_01, A.FX_CYBORG_LINES_02, A.FX_CYBORG_LINES_03, A.FX_CYBORG_LINES_04, A.FX_CYBORG_LINES_05);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.getSprite().locZ = g.SPRITE_LOCZ_EFFECTS_BACKGROUND;
  }
}
