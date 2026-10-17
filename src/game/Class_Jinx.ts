import { g } from '../runtime';
import { Class_Fighter } from './Class_Fighter';

export class Class_Jinx extends Class_Fighter {
  constructor(initHealth: number) {
    super(initHealth);
    this.visSprite.locZ = g.SPRITE_LOCZ_VILLAIN_FIGHTER;
    const C = g.classes;
    this.moves.set(g.MOVE_STAND, new C.Class_JinxStand(this));
    this.moves.set(g.MOVE_WALK_FORWARD, new C.Class_JinxWalkForward(this));
    this.moves.set(g.MOVE_WALK_BACKWARD, new C.Class_JinxWalkBackward(this));
    this.moves.set(g.MOVE_BLOCK, new C.Class_JinxBlock(this));
    this.moves.set(g.MOVE_JUMP, new C.Class_JinxJump(this));
    this.moves.set(g.MOVE_PUNCH, new C.Class_JinxPunch(this));
    this.moves.set(g.MOVE_KICK, new C.Class_JinxKick(this));
    this.moves.set(g.MOVE_STUN, new C.Class_JinxStun(this));
    this.moves.set(g.MOVE_KNOCK_DOWN, new C.Class_JinxKnockDown(this));
    this.moves.set(g.MOVE_DEFEAT, new C.Class_JinxDefeat(this));
    this.moves.set(g.MOVE_FALL, new C.Class_JinxFall(this));
    this.moves.set(g.MOVE_JINX_ENERGY_SPIN, new C.Class_JinxEnergySpin(this));
    this.moves.set(g.MOVE_JINX_ENERGY_BALL, new C.Class_JinxEnergyBall(this));
    this.moves.set(g.MOVE_JINX_POWER_KICK, new C.Class_JinxPowerKick(this));
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
