import { g, Point, list } from '../../../runtime';
import { Class_Projectile } from '../../actors/Class_Projectile';

// Extended by Class_GizmoHighMissileProjectile. No method here calls an overridable handler on `me`,
// so lingoMe is not needed.
export class Class_GizmoMissileProjectile extends Class_Projectile {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_GIZMO_AIR_MISSILE;
    this.stunDuration = 8;
    this.visSprite.blend = 85;
    const vis = list(g.MEMBER_0);
    const att = list(g.assets.GIZMO.GIZMO_MISSILE_PROJECTILE_01A);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.animation.setRepeat(10);
    this.attackMasks = att;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  // Unlike Class_Projectile.triggerPayoff, the missile is not killed when it hits.
  triggerPayoff(): number {
    if (!this.alive) return 0;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    return 1;
  }
}
