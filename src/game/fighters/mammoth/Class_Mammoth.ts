import { g } from '../../../runtime';
import { Class_Fighter } from '../Class_Fighter';

export class Class_Mammoth extends Class_Fighter {
  constructor(initHealth: number) {
    super(initHealth);
    this.visSprite.locZ = g.SPRITE_LOCZ_VILLAIN_FIGHTER;
    const C = g.classes;
    this.moves.set(g.MOVE_STAND, new C.Class_MammothStand(this));
    this.moves.set(g.MOVE_WALK_FORWARD, new C.Class_MammothWalkForward(this));
    this.moves.set(g.MOVE_WALK_BACKWARD, new C.Class_MammothWalkBackward(this));
    this.moves.set(g.MOVE_BLOCK, new C.Class_MammothBlock(this));
    this.moves.set(g.MOVE_JUMP, new C.Class_MammothJump(this));
    this.moves.set(g.MOVE_PUNCH, new C.Class_MammothPunch(this));
    // Same object as the stand move (so Fighter.destroy destroys it twice, harmlessly).
    this.moves.set(g.MOVE_KICK, this.moves.get(g.MOVE_STAND));
    this.moves.set(g.MOVE_STUN, new C.Class_MammothStun(this));
    this.moves.set(g.MOVE_KNOCK_DOWN, new C.Class_MammothKnockDown(this));
    this.moves.set(g.MOVE_DEFEAT, new C.Class_MammothDefeat(this));
    this.moves.set(g.MOVE_FALL, new C.Class_MammothFall(this));
    this.moves.set(g.MOVE_MAMMOTH_GROUND_PUNCH, new C.Class_MammothGroundPunch(this));
    this.moves.set(g.MOVE_MAMMOTH_JUMP_PUNCH, new C.Class_MammothJumpPunch(this));
    this.moves.set(g.MOVE_MAMMOTH_SHOULDER_BARGE, new C.Class_MammothShoulderBarge(this));
    this.shadow.setWidth(130);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
