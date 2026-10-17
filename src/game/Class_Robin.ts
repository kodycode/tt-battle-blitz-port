import { g } from '../runtime';
import { Class_Fighter } from './Class_Fighter';

export class Class_Robin extends Class_Fighter {
  constructor(initHealth: number) {
    super(initHealth);
    const C = g.classes;
    this.moves.set(g.MOVE_STAND, new C.Class_RobinStand(this));
    this.moves.set(g.MOVE_WALK_FORWARD, new C.Class_RobinWalkForward(this));
    this.moves.set(g.MOVE_WALK_BACKWARD, new C.Class_RobinWalkBackward(this));
    this.moves.set(g.MOVE_BLOCK, new C.Class_RobinBlock(this));
    this.moves.set(g.MOVE_JUMP, new C.Class_RobinJump(this));
    this.moves.set(g.MOVE_PUNCH, new C.Class_RobinPunch(this));
    this.moves.set(g.MOVE_KICK, new C.Class_RobinKick(this));
    this.moves.set(g.MOVE_STUN, new C.Class_RobinStun(this));
    this.moves.set(g.MOVE_KNOCK_DOWN, new C.Class_RobinKnockDown(this));
    this.moves.set(g.MOVE_DEFEAT, new C.Class_RobinDefeat(this));
    this.moves.set(g.MOVE_FALL, new C.Class_RobinFall(this));
    this.moves.set(g.MOVE_SUMMON_FIGHTER, new C.Class_RobinSummonTitan(this));
    this.moves.set(g.MOVE_ROBIN_FLYING_KICK, new C.Class_RobinFlyingKick(this));
    this.moves.set(g.MOVE_ROBIN_DISC_THROW, new C.Class_RobinDiscThrow(this));
    this.moves.set(g.MOVE_ROBIN_DIAG_JUMP_KICK, new C.Class_RobinDiagJumpKick(this));
    this.moves.set(g.MOVE_ROBIN_BOMB_THROW, new C.Class_RobinBombThrow(this));
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
