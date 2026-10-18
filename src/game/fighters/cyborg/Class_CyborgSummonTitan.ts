import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_CyborgSummonTitan extends Class_Move {
  STATE_LEADIN: number;
  STATE_ATTACK: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  stateAge: number;
  summonEffect: any;
  summonedFighterID: any;
  visAnim: any;
  visAltAnim: any;

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.CYBORG;
    const vis = list(A.CYBORG_PUNCH_01, A.CYBORG_PUNCH_02, A.CYBORG_PUNCH_03, A.CYBORG_PUNCH_04);
    const visAlt = list(A.CYBORG_PUNCH_ALT_01, A.CYBORG_PUNCH_ALT_02, A.CYBORG_PUNCH_ALT_03, A.CYBORG_PUNCH_ALT_04);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.CYBORG_PUNCH_01D, A.CYBORG_PUNCH_02D, A.CYBORG_PUNCH_03D, A.CYBORG_PUNCH_04D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 4);
    this.visAnim = new g.classes.Class_IndexedAnimation(vis, order);
    this.visAltAnim = new g.classes.Class_IndexedAnimation(visAlt, order);
    this.animation = this.visAnim;
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
    this.dirChanged();
  }

  dirChanged(): void {
    if (this.owner.dir > 0) this.animation = this.visAnim;
    else this.animation = this.visAltAnim;
    this.animation.reset();
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
    switch (this.moveState) {
      case this.STATE_LEADIN:
        if (this.initState) {
          this.initState = 0;
        }
        if (this.stateAge >= 8) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          g.game.addEffect(new g.classes.Class_CyborgSummonEffect(this.owner, this.owner.pos.add(point(120.0 * this.owner.dir, -105.0)), point(0, 0), this.owner.dir));
          this.summonEffect = g.game.summonTitan(this.owner, this.summonedFighterID);
          this.owner.opponent.setFrozen(1);
          g.game.freezeProjectiles(this.owner.opponent, 1);
          g.game.freezeEffects(this.owner.opponent, 1);
        }
        if (!this.summonEffect.isAlive()) {
          this.summonEffect = undefined;
          this.owner.opponent.setFrozen(0);
          g.game.freezeProjectiles(this.owner.opponent, 0);
          g.game.freezeEffects(this.owner.opponent, 0);
          this.advanceState();
        }
        break;
      case this.STATE_FINISH:
        if (this.initState) {
          this.animation.advance();
          this.initState = 0;
        }
        if (this.stateAge === 4) this.animation.advance();
        else if (this.stateAge >= 8) this.moveDone = 1;
        break;
    }
  }
}
