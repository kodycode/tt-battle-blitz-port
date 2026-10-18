import { g } from '../../../runtime';
import { Class_Fighter } from '../Class_Fighter';

export class Class_Starfire extends Class_Fighter {
  constructor(initHealth: number) {
    super(initHealth);
    const C = g.classes;
    this.moves.set(g.MOVE_STAND, new C.Class_StarfireStand(this));
    this.moves.set(g.MOVE_WALK_FORWARD, new C.Class_StarfireWalkForward(this));
    this.moves.set(g.MOVE_WALK_BACKWARD, new C.Class_StarfireWalkBackward(this));
    this.moves.set(g.MOVE_BLOCK, new C.Class_StarfireBlock(this));
    this.moves.set(g.MOVE_JUMP, new C.Class_StarfireJump(this));
    this.moves.set(g.MOVE_PUNCH, new C.Class_StarfirePunch(this));
    this.moves.set(g.MOVE_KICK, new C.Class_StarfireKick(this));
    this.moves.set(g.MOVE_STUN, new C.Class_StarfireStun(this));
    this.moves.set(g.MOVE_KNOCK_DOWN, new C.Class_StarfireKnockDown(this));
    this.moves.set(g.MOVE_DEFEAT, new C.Class_StarfireDefeat(this));
    this.moves.set(g.MOVE_FALL, new C.Class_StarfireFall(this));
    this.moves.set(g.MOVE_SUMMON_FIGHTER, new C.Class_StarfireSummonTitan(this));
    this.moves.set(g.MOVE_STARFIRE_DIAG_JUMP_KICK, new C.Class_StarfireDiagJumpKick(this));
    this.moves.set(g.MOVE_STARFIRE_ENERGY_BALL, new C.Class_StarfireEnergyBall(this));
    this.moves.set(g.MOVE_STARFIRE_BOLT_BARRAGE, new C.Class_StarfireBoltBarrage(this));
    this.moves.set(g.MOVE_STARFIRE_FLYING_KNEE, new C.Class_StarfireFlyingKnee(this));
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
