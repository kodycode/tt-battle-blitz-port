import { g, Point, Member, LList, list, point } from '../../../runtime';
import { Class_Projectile } from '../../actors/Class_Projectile';

export class Class_RavenMidairAttackProjectile extends Class_Projectile {
  leftObj: any; // declared in the Lingo property list, never used
  rightObj: any; // declared in the Lingo property list, never used
  leftObjOffset: any; // declared in the Lingo property list, never used
  rightObjOffset: any; // declared in the Lingo property list, never used
  shadow: any;
  needInit: number;
  centerPos: Point;
  trail1: any;
  trail2: any;
  loopOffsets: LList<Point>;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_RAVEN_MIDAIR_ATTACK;
    this.stunDuration = 10;
    const S = g.assets.CHAR_SHARED;
    const A = g.assets.RAVEN;
    let vis: LList<Member>;
    let att: LList<Member>;
    switch (g.villainID) {
      case g.FIGHTER_ID_JINX:
        vis = list(S.FX_RAVEN_OBJ_TIRE_01);
        att = list(A.FX_RAVEN_OBJ_TIRE_01A);
        break;
      case g.FIGHTER_ID_GIZMO:
        vis = list(S.FX_RAVEN_OBJ_COG_01);
        att = list(A.FX_RAVEN_OBJ_COG_01A);
        break;
      case g.FIGHTER_ID_MAMMOTH:
        vis = list(S.FX_RAVEN_OBJ_IBEAM_SM_01);
        att = list(A.FX_RAVEN_OBJ_IBEAM_SM_01A);
        break;
      case g.FIGHTER_ID_CINDERBLOCK:
        vis = list(S.FX_RAVEN_OBJ_CONCRETE_SM_01);
        att = list(A.FX_RAVEN_OBJ_CONCRETE_SM_01A);
        break;
      case g.FIGHTER_ID_PLASMUS:
        vis = list(S.FX_RAVEN_OBJ_ENGINE_01);
        att = list(A.FX_RAVEN_OBJ_ENGINE_01A);
        break;
      default:
        vis = list(S.FX_RAVEN_OBJ_TIRE_01);
        att = list(A.FX_RAVEN_OBJ_TIRE_01A);
    }
    this.attackMasks = att;
    this.loopOffsets = list(
      point(0.0, 70.0),
      point(72.0, 62.0),
      point(118.0, 32.0),
      point(128.0, -8.0),
      point(107.0, -42.0),
      point(60.0, -64.0),
      point(0.0, -70.0),
      point(-60, -64.0),
      point(-107.0, -42.0),
      point(-128.0, -8.0),
      point(-118.0, 32.0),
      point(-72.0, 62.0),
    );
    this.trail1 = new g.classes.Class_StaticActor(vis.get(1), g.SPRITE_LOCZ_EFFECTS_FOREGROUND, this.pos, initVel, initDir);
    this.trail1.visSprite.ink = g.INK_BGTRANSPARENT;
    this.trail1.visSprite.blend = 60;
    this.trail2 = new g.classes.Class_StaticActor(vis.get(1), g.SPRITE_LOCZ_EFFECTS_FOREGROUND, this.pos, initVel, initDir);
    this.trail2.visSprite.ink = g.INK_BGTRANSPARENT;
    this.trail2.visSprite.blend = 20;
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.shadow = new g.classes.Class_Shadow(this, 150);
    this.centerPos = initPos;
    this.needInit = 1;
  }

  destroy(): undefined {
    super.destroy();
    this.trail1.destroy();
    this.trail2.destroy();
    this.shadow.destroy();
    return undefined;
  }

  getLoopOffset(index: number): Point {
    let i = index - 1;
    if (i <= 0) i = this.loopOffsets.count - i;
    if (this.dir > 0) return this.loopOffsets.get((i % this.loopOffsets.count) + 1);
    return this.loopOffsets.get(this.loopOffsets.count - (i % this.loopOffsets.count));
  }

  update(): void {
    this.age = this.age + 1;
    if (this.alive) {
      if (this.needInit) this.needInit = 0;
      this.setPos(this.centerPos.add(this.getLoopOffset(this.age)));
      this.trail1.setPos(this.centerPos.add(this.getLoopOffset(this.age - 1)));
      this.trail2.setPos(this.centerPos.add(this.getLoopOffset(this.age - 2)));
      this.visSprite.member = this.animation.getMember();
      this.updateBoundingBoxes();
      this.shadow.update();
    }
  }

  paint(): void {
    super.paint();
    this.shadow.paint();
    this.trail1.paint();
    this.trail2.paint();
  }

  triggerPayoff(): number {
    if (!this.alive) return 0;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.RAVEN.SFX_RAVEN_LEVITATEDOBJECTSMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_RavenExplodeEffect(this.owner, this.owner.opponent.pos.add(point(20.0 * -this.owner.dir, -60.0)), point(0, 0), this.dir));
    g.main.audioMgr.playSound(g.assets.RAVEN.SFX_RAVEN_LEVITATEDOBJECTSHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
