import { g } from '../runtime';
import { Class_Fighter } from './Class_Fighter';

export class Class_Beastboy extends Class_Fighter {
  constructor(initHealth: number) {
    super(initHealth);
    const C = g.classes;
    this.moves.set(g.MOVE_STAND, new C.Class_BeastboyStand(this));
    this.moves.set(g.MOVE_WALK_FORWARD, new C.Class_BeastboyWalkForward(this));
    this.moves.set(g.MOVE_WALK_BACKWARD, new C.Class_BeastboyWalkBackward(this));
    this.moves.set(g.MOVE_BLOCK, new C.Class_BeastboyBlock(this));
    this.moves.set(g.MOVE_JUMP, new C.Class_BeastboyJump(this));
    this.moves.set(g.MOVE_PUNCH, new C.Class_BeastboyPunch(this));
    this.moves.set(g.MOVE_KICK, new C.Class_BeastboyKick(this));
    this.moves.set(g.MOVE_STUN, new C.Class_BeastboyStun(this));
    this.moves.set(g.MOVE_KNOCK_DOWN, new C.Class_BeastboyKnockDown(this));
    this.moves.set(g.MOVE_DEFEAT, new C.Class_BeastboyDefeat(this));
    this.moves.set(g.MOVE_FALL, new C.Class_BeastboyFall(this));
    this.moves.set(g.MOVE_SUMMON_FIGHTER, new C.Class_BeastboySummonTitan(this));
    this.moves.set(g.MOVE_BEASTBOY_GORILLA_SMASH, new C.Class_BeastboyGorillaSmash(this));
    this.moves.set(g.MOVE_BEASTBOY_EAGLE_STRIKE, new C.Class_BeastboyEagleStrike(this));
    this.moves.set(g.MOVE_BEASTBOY_RHINO_CHARGE, new C.Class_BeastboyRhinoCharge(this));
    this.moves.set(g.MOVE_BEASTBOY_PTERODACTYL_SWOOP, new C.Class_BeastboyPterodactylSwoop(this));
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
