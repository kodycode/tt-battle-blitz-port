import { g, Point, list, point, voidp } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_GizmoCannonProjectile extends Class_Projectile {
  effect: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_GIZMO_CANNON;
    this.stunDuration = 8;
    this.visSprite.blend = 85;
    const A = g.assets.GIZMO;
    const vis = list(A.FX_GIZMO_CANNON_SHOT_01, A.FX_GIZMO_CANNON_SHOT_02, A.FX_GIZMO_CANNON_SHOT_03, A.FX_GIZMO_CANNON_SHOT_04, A.FX_GIZMO_CANNON_SHOT_05, A.FX_GIZMO_CANNON_SHOT_06);
    const att = list(A.FX_GIZMO_CANNON_SHOT_01A, A.FX_GIZMO_CANNON_SHOT_01A, A.FX_GIZMO_CANNON_SHOT_01A, A.FX_GIZMO_CANNON_SHOT_01A, A.FX_GIZMO_CANNON_SHOT_01A, A.FX_GIZMO_CANNON_SHOT_01A);
    const order = list(1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.effect = new g.classes.Class_GizmoCannonBlastEffect(owner, owner.pos.add(point(28 * owner.dir, -75)), point(0, 0), owner.dir);
    g.main.screen.addEffect(this.effect);
    g.main.audioMgr.playSound(A.SFX_GIZMO_BACKPACKCANNONSHOOTING, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  // Class_Projectile.destroy runs with Lingo ancestor `me` (lingoMe), so its kill() call reaches
  // Class_Projectile.kill, not this override: the blast effect is not killed from destroy (as in the original).
  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  kill(): void {
    super.kill();
    if (!voidp(this.effect)) {
      g.game.killEffect(this.effect);
      this.effect = undefined;
      g.main.audioMgr.stopSound(g.assets.GIZMO.SFX_GIZMO_BACKPACKCANNONSHOOTING);
    }
  }

  triggerPayoff(): number {
    if (!this.alive) return 0;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_CANNONMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_GizmoExplodeEffect(this.owner, this.owner.opponent.pos.add(point(0.0, -75.0)), point(0, 0), this.dir));
    g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_CANNONHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
