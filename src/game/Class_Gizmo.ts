import { g } from '../runtime';
import { Class_Fighter } from './Class_Fighter';

export class Class_Gizmo extends Class_Fighter {
  HOVER_HEIGHT: number;
  flying: number;

  constructor(initHealth: number) {
    super(initHealth);
    this.WALK_SPEED = 20;
    this.visSprite.locZ = g.SPRITE_LOCZ_VILLAIN_FIGHTER;
    this.HOVER_HEIGHT = -40.0;
    const C = g.classes;
    this.moves.set(g.MOVE_STAND, new C.Class_GizmoStand(this));
    this.moves.set(g.MOVE_WALK_FORWARD, new C.Class_GizmoWalkForward(this));
    this.moves.set(g.MOVE_WALK_BACKWARD, new C.Class_GizmoWalkBackward(this));
    this.moves.set(g.MOVE_BLOCK, new C.Class_GizmoBlock(this));
    this.moves.set(g.MOVE_JUMP, new C.Class_GizmoJump(this));
    this.moves.set(g.MOVE_PUNCH, new C.Class_GizmoPunch(this));
    // The kick slot shares the stand move object (destroyed twice by Class_Fighter.destroy, as in the original).
    this.moves.set(g.MOVE_KICK, this.moves.get(g.MOVE_STAND));
    this.moves.set(g.MOVE_STUN, new C.Class_GizmoStun(this));
    this.moves.set(g.MOVE_KNOCK_DOWN, new C.Class_GizmoKnockDown(this));
    this.moves.set(g.MOVE_DEFEAT, new C.Class_GizmoDefeat(this));
    this.moves.set(g.MOVE_FALL, new C.Class_GizmoFall(this));
    this.moves.set(g.MOVE_GIZMO_HOVER, new C.Class_GizmoHover(this));
    this.moves.set(g.MOVE_GIZMO_TAKE_OFF, new C.Class_GizmoTakeOff(this));
    this.moves.set(g.MOVE_GIZMO_LAND, new C.Class_GizmoLand(this));
    this.moves.set(g.MOVE_GIZMO_FLY_FORWARD, new C.Class_GizmoFlyForward(this));
    this.moves.set(g.MOVE_GIZMO_FLY_BACKWARD, new C.Class_GizmoFlyBackward(this));
    this.moves.set(g.MOVE_GIZMO_AIR_STUN, new C.Class_GizmoAirStun(this));
    this.moves.set(g.MOVE_GIZMO_CANNON, new C.Class_GizmoCannon(this));
    this.moves.set(g.MOVE_GIZMO_AIR_CANNON, new C.Class_GizmoAirCannon(this));
    this.moves.set(g.MOVE_GIZMO_AIR_MISSILE, new C.Class_GizmoAirMissile(this));
    this.moves.set(g.MOVE_GIZMO_HIGH_AIR_MISSILE, new C.Class_GizmoHighAirMissile(this));
    this.moves.set(g.MOVE_GIZMO_AIR_JUMP, new C.Class_GizmoAirJump(this));
    this.moves.set(g.MOVE_GIZMO_AIR_BLOCK, new C.Class_GizmoAirBlock(this));
    this.moves.set(g.MOVE_GIZMO_AIR_PUNCH, new C.Class_GizmoAirPunch(this));
    this.shadow.setWidth(70);
    this.flying = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  // Overrides Class_Fighter.queueDefaultMove. Class_Fighter.update reaches it through normal dispatch
  // (Class_Gizmo does not override update), so the Gizmo version runs there.
  queueDefaultMove(): void {
    if (this.isOnGround()) this.queueMove(g.MOVE_STAND, 0);
    else this.queueMove(g.MOVE_GIZMO_HOVER, 0);
  }

  isFlying(): number {
    return this.flying;
  }

  setFlying(b: any): void {
    if (b) this.flying = 1;
    else this.flying = 0;
  }

  // Overrides Class_Fighter.queueStun (reached from Class_Fighter.reactToCollision by normal dispatch).
  queueStun(dur: any): void {
    if (this.isOnGround()) this.queueMove(g.MOVE_STUN, dur);
    else this.queueMove(g.MOVE_GIZMO_AIR_STUN, dur);
  }
}
