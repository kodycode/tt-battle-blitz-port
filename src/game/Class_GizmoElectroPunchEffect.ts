import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_GizmoElectroPunchEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.visSprite.locZ = g.SPRITE_LOCZ_EFFECTS_BACKGROUND;
    const A = g.assets.GIZMO;
    const vis = list(A.FX_GIZMO_ELECTRO_PUNCH_01, A.FX_GIZMO_ELECTRO_PUNCH_02, A.FX_GIZMO_ELECTRO_PUNCH_03, A.FX_GIZMO_ELECTRO_PUNCH_04, A.FX_GIZMO_ELECTRO_PUNCH_05, A.FX_GIZMO_ELECTRO_PUNCH_06, A.FX_GIZMO_ELECTRO_PUNCH_07, A.fx_gizmo_electro_punch_08);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
