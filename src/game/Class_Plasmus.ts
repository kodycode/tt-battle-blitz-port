import { g } from '../runtime';
import { Class_Fighter } from './Class_Fighter';

export class Class_Plasmus extends Class_Fighter {
  constructor(initHealth: number) {
    super(initHealth);
    this.WALK_SPEED = 8.0;
    this.visSprite.locZ = g.SPRITE_LOCZ_VILLAIN_FIGHTER;
    const C = g.classes;
    this.moves.set(g.MOVE_STAND, new C.Class_PlasmusStand(this));
    this.moves.set(g.MOVE_WALK_FORWARD, new C.Class_PlasmusWalkForward(this));
    this.moves.set(g.MOVE_WALK_BACKWARD, new C.Class_PlasmusWalkBackward(this));
    this.moves.set(g.MOVE_BLOCK, new C.Class_PlasmusBlock(this));
    // Jump/kick/fall share the stand move object (Fighter.destroy destroys it once per slot, as in Lingo).
    this.moves.set(g.MOVE_JUMP, this.moves.get(g.MOVE_STAND));
    this.moves.set(g.MOVE_PUNCH, new C.Class_PlasmusPunch(this));
    this.moves.set(g.MOVE_KICK, this.moves.get(g.MOVE_STAND));
    this.moves.set(g.MOVE_STUN, new C.Class_PlasmusStun(this));
    this.moves.set(g.MOVE_KNOCK_DOWN, new C.Class_PlasmusKnockDown(this));
    this.moves.set(g.MOVE_DEFEAT, new C.Class_PlasmusDefeat(this));
    this.moves.set(g.MOVE_FALL, this.moves.get(g.MOVE_STAND));
    this.moves.set(g.MOVE_PLASMUS_SLUDGE_THROW, new C.Class_PlasmusSludgeThrow(this));
    this.moves.set(g.MOVE_PLASMUS_CRAB_THROW, new C.Class_PlasmusCrabThrow(this));
    this.moves.set(g.MOVE_PLASMUS_CHEST_BLAST, new C.Class_PlasmusChestBlast(this));
    this.moves.set(g.MOVE_PLASMUS_ARM_SWIPE, new C.Class_PlasmusArmSwipe(this));
    this.shadow.setWidth(200);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
