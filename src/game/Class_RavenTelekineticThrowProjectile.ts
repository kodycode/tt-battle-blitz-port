import { g, Point, Member, LList, list, point } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_RavenTelekineticThrowProjectile extends Class_Projectile {
  needInit: number;
  shadow: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_RAVEN_TELEKINETIC_THROW;
    this.stunDuration = 10;
    this.needInit = 1;
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
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.shadow = new g.classes.Class_Shadow(this, 50);
  }

  destroy(): undefined {
    super.destroy();
    this.shadow.destroy();
    return undefined;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.alive) {
      if (this.needInit) this.needInit = 0;
      this.setPos(this.pos.add(this.vel));
      if (this.isOutOfPlay()) this.kill();
      if (this.age > 1) this.animation.advance();
      this.visSprite.member = this.animation.getMember();
      this.updateBoundingBoxes();
      this.shadow.update();
    }
  }

  paint(): void {
    super.paint();
    this.shadow.paint();
  }

  // Does not kill the projectile on a hit (it keeps flying), as in the Lingo.
  triggerPayoff(): number {
    if (!this.alive) return 0;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.RAVEN.SFX_RAVEN_LEVITATEDOBJECTSMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_RavenExplodeEffect(this.owner, this.pos, point(0, 0), this.dir));
    g.main.audioMgr.playSound(g.assets.RAVEN.SFX_RAVEN_LEVITATEDOBJECTSHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
