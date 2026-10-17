import { g, Point, list } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_PlasmusSludgeSplatProjectile extends Class_Projectile {
  needInit: number;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_PLASMUS_SLUDGE_SPLAT;
    this.stunDuration = 10;
    this.needInit = 1;
    const A = g.assets.PLASMUS;
    const vis = list(
      A.PLASMUS_SLUDGE_01, A.PLASMUS_SLUDGE_02, A.PLASMUS_SLUDGE_03, A.PLASMUS_SLUDGE_04,
      A.PLASMUS_SLUDGE_05, A.PLASMUS_SLUDGE_06, A.PLASMUS_SLUDGE_07, A.PLASMUS_SLUDGE_08,
      A.PLASMUS_SLUDGE_09, A.PLASMUS_SLUDGE_10, A.PLASMUS_SLUDGE_11, A.PLASMUS_SLUDGE_12,
      A.PLASMUS_SLUDGE_13, A.PLASMUS_SLUDGE_14, A.PLASMUS_SLUDGE_15, A.PLASMUS_SLUDGE_16,
    );
    const S = A.PLASMUS_SLUDGE_01A;
    const att = list(g.MEMBER_0, S, S, S, S, S, S, S, S, S, S, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.alive) {
      if (this.needInit) {
        this.needInit = 0;
        g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_GLOBULEWOOSH, 100, g.SFX_EVENT_PRIORITY_LOW);
      }
      if (this.age > 1) this.animation.advance();
      this.visSprite.member = this.animation.getMember();
      this.updateBoundingBoxes();
      if (this.animation.isDone()) this.kill();
    }
  }

  triggerPayoff(): number {
    if (!this.alive) return 0;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_GLOBULEMISS, 50, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_GLOBULEHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
