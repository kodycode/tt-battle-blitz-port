import { g } from '../../../runtime';
import { Class_Fighter } from '../Class_Fighter';

export class Class_Cinderblock extends Class_Fighter {
  constructor(initHealth: number) {
    super(initHealth);
    this.WALK_SPEED = 8.0;
    this.visSprite.locZ = g.SPRITE_LOCZ_VILLAIN_FIGHTER;
    const C = g.classes;
    this.moves.set(g.MOVE_STAND, new C.Class_CinderblockStand(this));
    this.moves.set(g.MOVE_WALK_FORWARD, new C.Class_CinderblockWalkForward(this));
    this.moves.set(g.MOVE_WALK_BACKWARD, new C.Class_CinderblockWalkBackward(this));
    this.moves.set(g.MOVE_BLOCK, new C.Class_CinderblockBlock(this));
    this.moves.set(g.MOVE_JUMP, this.moves.get(g.MOVE_STAND));
    this.moves.set(g.MOVE_PUNCH, new C.Class_CinderblockPunch(this));
    this.moves.set(g.MOVE_KICK, new C.Class_CinderblockKick(this));
    this.moves.set(g.MOVE_STUN, new C.Class_CinderblockStun(this));
    this.moves.set(g.MOVE_KNOCK_DOWN, new C.Class_CinderblockKnockDown(this));
    this.moves.set(g.MOVE_DEFEAT, new C.Class_CinderblockDefeat(this));
    this.moves.set(g.MOVE_FALL, this.moves.get(g.MOVE_STAND));
    this.moves.set(g.MOVE_CINDERBLOCK_DOUBLE_PUNCH, new C.Class_CinderblockDoublePunch(this));
    this.moves.set(g.MOVE_CINDERBLOCK_STOMP, new C.Class_CinderblockStomp(this));
    this.moves.set(g.MOVE_CINDERBLOCK_BACKHAND, new C.Class_CinderblockBackhand(this));
    this.shadow.setWidth(180);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
