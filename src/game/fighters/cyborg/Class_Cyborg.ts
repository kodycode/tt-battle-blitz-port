import { g } from '../../../runtime';
import { Class_Fighter } from '../Class_Fighter';

export class Class_Cyborg extends Class_Fighter {
  constructor(initHealth: number) {
    super(initHealth);
    const C = g.classes;
    this.moves.set(g.MOVE_STAND, new C.Class_CyborgStand(this));
    this.moves.set(g.MOVE_WALK_FORWARD, new C.Class_CyborgWalkForward(this));
    this.moves.set(g.MOVE_WALK_BACKWARD, new C.Class_CyborgWalkBackward(this));
    this.moves.set(g.MOVE_BLOCK, new C.Class_CyborgBlock(this));
    this.moves.set(g.MOVE_JUMP, new C.Class_CyborgJump(this));
    this.moves.set(g.MOVE_PUNCH, new C.Class_CyborgPunch(this));
    this.moves.set(g.MOVE_KICK, new C.Class_CyborgKick(this));
    this.moves.set(g.MOVE_STUN, new C.Class_CyborgStun(this));
    this.moves.set(g.MOVE_KNOCK_DOWN, new C.Class_CyborgKnockDown(this));
    this.moves.set(g.MOVE_DEFEAT, new C.Class_CyborgDefeat(this));
    this.moves.set(g.MOVE_FALL, new C.Class_CyborgFall(this));
    this.moves.set(g.MOVE_SUMMON_FIGHTER, new C.Class_CyborgSummonTitan(this));
    this.moves.set(g.MOVE_CYBORG_SONIC_CANNON, new C.Class_CyborgSonicCannon(this));
    this.moves.set(g.MOVE_CYBORG_FLYING_PUNCH, new C.Class_CyborgFlyingPunch(this));
    this.moves.set(g.MOVE_CYBORG_POWER_SMASH, new C.Class_CyborgPowerSmash(this));
    this.moves.set(g.MOVE_CYBORG_CYBER_STOMP, new C.Class_CyborgCyberStomp(this));
    this.shadow.setWidth(130);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
