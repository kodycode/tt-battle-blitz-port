import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_StarfireSummonTitan extends Class_Move {
  STATE_LEADIN: number;
  STATE_ATTACK: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  stateAge: number;
  summonEffect: any;
  summonedFighterID: any;

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.STARFIRE;
    const vis = list(A.STARFIRE_PUNCH_01, A.STARFIRE_PUNCH_02, A.STARFIRE_PUNCH_03);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.STARFIRE_PUNCH_01D, A.STARFIRE_PUNCH_02D, A.STARFIRE_PUNCH_03D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LEADIN = 1;
    this.STATE_ATTACK = 2;
    this.STATE_FINISH = 3;
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
    this.summonedFighterID = arg;
  }

  setState(i: number): void {
    this.initState = 1;
    this.moveState = i;
    this.stateAge = 0;
  }

  advanceState(): void {
    this.setState(this.moveState + 1);
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (this.moveDone) return;
    const o = this.owner;
    switch (this.moveState) {
      case this.STATE_LEADIN:
        if (this.initState) {
          this.initState = 0;
          // Lingo uses g.game.addEffect here (other moves use g.main.screen.addEffect).
          g.game.addEffect(new g.classes.Class_StarfireConjureEffect(o, o.pos.add(point(-24.0 * o.dir, -133.0)), point(0, 0), o.dir));
        }
        if (this.stateAge >= 8) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          g.main.screen.addEffect(new g.classes.Class_StarfireFistEffect(o, o.pos.add(point(85 * o.dir, -138)), point(0.0, 0.0), o.dir));
          this.summonEffect = g.game.summonTitan(o, this.summonedFighterID);
          o.opponent.setFrozen(1);
          g.game.freezeProjectiles(o.opponent, 1);
          g.game.freezeEffects(o.opponent, 1);
        }
        if (!this.summonEffect.isAlive()) {
          this.summonEffect = undefined;
          o.opponent.setFrozen(0);
          g.game.freezeProjectiles(o.opponent, 0);
          g.game.freezeEffects(o.opponent, 0);
          this.advanceState();
        }
        break;
      case this.STATE_FINISH:
        if (this.initState) {
          this.animation.advance();
          this.initState = 0;
        }
        if (this.stateAge === 4) this.moveDone = 1;
        break;
    }
  }
}
