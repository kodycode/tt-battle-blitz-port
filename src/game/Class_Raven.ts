import { g } from '../runtime';
import { Class_Fighter } from './Class_Fighter';

export class Class_Raven extends Class_Fighter {
  constructor(initHealth: number) {
    super(initHealth);
    const C = g.classes;
    this.moves.set(g.MOVE_STAND, new C.Class_RavenStand(this));
    this.moves.set(g.MOVE_WALK_FORWARD, new C.Class_RavenWalkForward(this));
    this.moves.set(g.MOVE_WALK_BACKWARD, new C.Class_RavenWalkBackward(this));
    this.moves.set(g.MOVE_BLOCK, new C.Class_RavenBlock(this));
    this.moves.set(g.MOVE_JUMP, new C.Class_RavenJump(this));
    this.moves.set(g.MOVE_PUNCH, new C.Class_RavenPunch(this));
    this.moves.set(g.MOVE_KICK, new C.Class_RavenKick(this));
    this.moves.set(g.MOVE_STUN, new C.Class_RavenStun(this));
    this.moves.set(g.MOVE_KNOCK_DOWN, new C.Class_RavenKnockDown(this));
    this.moves.set(g.MOVE_DEFEAT, new C.Class_RavenDefeat(this));
    this.moves.set(g.MOVE_FALL, new C.Class_RavenFall(this));
    this.moves.set(g.MOVE_SUMMON_FIGHTER, new C.Class_RavenSummonTitan(this));
    this.moves.set(g.MOVE_RAVEN_TELEKINETIC_THROW, new C.Class_RavenTelekineticThrow(this));
    this.moves.set(g.MOVE_RAVEN_EXPLOSIVE_DROP, new C.Class_RavenExplosiveDrop(this));
    this.moves.set(g.MOVE_RAVEN_TELEKINETIC_SPIN, new C.Class_RavenTelekineticSpin(this));
    this.moves.set(g.MOVE_RAVEN_MIDAIR_ATTACK, new C.Class_RavenMidairAttack(this));
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
