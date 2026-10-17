import { g, list, point } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_GizmoHighAirMissile extends Class_Move {
  STATE_CROUCH: number;
  STATE_ASCENT: number;
  STATE_LAUNCH: number;
  STATE_WAIT: number;
  STATE_DESCENT: number;
  STATE_LAND: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  projectile: any; // declared in Lingo, never assigned

  constructor(owner: any) {
    super(owner);
    this.attackDamage = g.DAMAGE_GIZMO_CANNON;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.GIZMO;
    const vis = list(A.GIZMO_TAKEOFF_11, A.GIZMO_TAKEOFF_10, A.GIZMO_TAKEOFF_09, A.GIZMO_TAKEOFF_08, A.GIZMO_HOVER_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.GIZMO_TAKEOFF_11D, A.GIZMO_TAKEOFF_10D, A.GIZMO_TAKEOFF_09D, A.GIZMO_TAKEOFF_08D, A.GIZMO_HOVER_01D);
    const order = list(1, 2, 3, 4, 4, 4, 2, 5);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_CROUCH = 1;
    this.STATE_ASCENT = 2;
    this.STATE_LAUNCH = 3;
    this.STATE_WAIT = 4;
    this.STATE_DESCENT = 5;
    this.STATE_LAND = 6;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    this.owner.setOnGround(0);
  }

  // Lingo `on advanceState` (no `me`, called locally).
  advanceState(): void {
    this.initState = 1;
    this.moveState = this.moveState + 1;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.moveDone) return;
    switch (this.moveState) {
      case this.STATE_CROUCH:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 2;
        }
        this.owner.moveBy(0.0, 15.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setVelY(-40);
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, point(this.owner.getPosX(), 0.0), point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_JUMP_1, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.getVelY() > 0) {
          this.owner.setVel(0, 0);
          this.advanceState();
        }
        break;
      case this.STATE_LAUNCH:
        if (this.initState) this.initState = 0;
        if (this.age > 1) this.animation.advance();
        if (this.animation.orderIndex === 7) this.advanceState();
        break;
      case this.STATE_WAIT: {
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 23;
          g.main.screen.addEffect(new g.classes.Class_GizmoHighMissileEffect(this.owner, this.owner.pos.add(point(50 * this.owner.dir, -75)), point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_MISSILEFIRE, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        const baseX = 330;
        const baseY = 10;
        const C = g.classes;
        const o = this.owner;
        if (this.delayFrames === 16) {
          g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_MISSILEINFLIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
        } else if (this.delayFrames === 10) {
          g.main.screen.addEffect(new C.Class_GroundExplode2Effect(o, point(o.getPosX() + baseX * o.dir, baseY), point(0, 0), o.dir));
          g.main.screen.addProjectile(new C.Class_GizmoHighMissileProjectile(o, point(o.getPosX() + baseX * o.dir, 0.0), point(0, 0), o.dir));
          g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_MISSILEHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
        } else if (this.delayFrames === 7) {
          g.main.screen.addEffect(new C.Class_GroundExplode1Effect(o, point(o.getPosX() + (baseX - 20) * o.dir, baseY + 5), point(0, 0), o.dir));
        } else if (this.delayFrames === 5) {
          g.main.screen.addEffect(new C.Class_GroundExplode1Effect(o, point(o.getPosX() + (baseX + 10) * o.dir, baseY + 10), point(0, 0), o.dir));
          g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_MISSILEHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
        } else if (this.delayFrames === 4) {
          g.main.screen.addEffect(new C.Class_LightColumnEffect(o, point(o.getPosX() + baseX * o.dir, baseY), point(0, 0), o.dir));
        } else if (this.delayFrames === 3) {
          g.main.screen.addEffect(new C.Class_GroundExplode2Effect(o, point(o.getPosX() + (baseX - 30) * o.dir, baseY - 10), point(0, 0), o.dir));
        } else if (this.delayFrames === 0) {
          g.main.screen.addEffect(new C.Class_GroundExplode2Effect(o, point(o.getPosX() + (baseX + 5) * o.dir, baseY + 5), point(0, 0), o.dir));
          g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_MISSILEHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
          this.advanceState();
        }
        break;
      }
      case this.STATE_DESCENT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
        }
        this.owner.accelerate(g.gravity);
        // Tests against HOVER_HEIGHT + 12 but snaps to y = 12.0 (verified in .lasm); STATE_LAND then rises
        // back up to HOVER_HEIGHT.
        if (this.owner.getPosY() + this.owner.getVelY() >= this.owner.HOVER_HEIGHT + 12.0) {
          this.owner.setVel(0.0, 0.0);
          this.owner.setPosY(12.0);
          this.advanceState();
        }
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setVel(0.0, -10.0);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, point(this.owner.getPosX(), 0.0), point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.owner.getPosY() <= this.owner.HOVER_HEIGHT) {
          this.owner.setVel(0.0, 0.0);
          this.owner.setPosY(this.owner.HOVER_HEIGHT);
          this.moveDone = 1;
        }
        break;
    }
  }
}
