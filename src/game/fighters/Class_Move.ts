import { g, Member, LList, Rect, rect, voidp, bitOr, bitAnd, bitNot, lingoMe } from '../../runtime';

export class Class_Move {
  owner: any;
  MOVETYPE_UNDEFINED: number;
  MOVETYPE_ATTACK: number;
  MOVETYPE_INTERRUPTIBLE: number;
  MOVETYPE_VULNERABLE: number;
  MOVETYPE_INIT_OWNER_DIR: number;
  MOVETYPE_USES_PROJECTILE: number;
  MOVETYPE_IMMOBILE: number;
  MOVETYPE_MELEE: number;
  moveType: number;
  moveDone: number;
  animation: any;
  age: number;
  attackMasks: LList<Member>;
  defenseMasks: LList<Member>;
  attackDamage: number;
  defenseRating: number;
  stunDuration: number;
  hitOpponent: number;

  constructor(obj: any) {
    this.owner = obj;
    this.MOVETYPE_UNDEFINED = 0;
    this.MOVETYPE_ATTACK = 1;
    this.MOVETYPE_INTERRUPTIBLE = 2;
    this.MOVETYPE_VULNERABLE = 4;
    this.MOVETYPE_INIT_OWNER_DIR = 8;
    this.MOVETYPE_USES_PROJECTILE = 16;
    this.MOVETYPE_IMMOBILE = 32;
    this.MOVETYPE_MELEE = 64;
    this.moveType = this.MOVETYPE_UNDEFINED;
    this.setType(this.MOVETYPE_INTERRUPTIBLE);
    this.moveDone = 0;
    this.age = 0;
    this.attackMasks = new LList();
    this.defenseMasks = new LList();
    this.attackDamage = 0;
    this.defenseRating = 0;
    this.stunDuration = g.STUN_DURATION_DEFAULT;
    this.hitOpponent = 0;
  }

  destroy(): undefined {
    return undefined;
  }

  update(): void {
    this.age = this.age + 1;
    if (!voidp(this.animation)) {
      if (this.age > 1) this.animation.advance();
      this.moveDone = this.animation.isDone();
    }
  }

  isDone(): number {
    return this.moveDone;
  }

  reset(_arg?: any): void {
    this.moveDone = 0;
    this.age = 0;
    this.animation.reset();
    this.hitOpponent = 0;
  }

  stop(): void {}

  setType(attrib: number): void {
    this.moveType = bitOr(this.moveType, attrib);
  }
  clearType(attrib: number): void {
    this.moveType = bitAnd(this.moveType, bitNot(attrib));
  }
  resetType(_attrib?: number): void {
    this.moveType = this.MOVETYPE_UNDEFINED;
  }
  hasType(attrib: number): boolean {
    return bitAnd(this.moveType, attrib) !== 0;
  }

  isAttack(): boolean {
    return this.hasType(this.MOVETYPE_ATTACK);
  }
  setAttack(b: any): void {
    if (b) this.setType(this.MOVETYPE_ATTACK);
    else this.clearType(this.MOVETYPE_ATTACK);
  }
  isInterruptible(): boolean {
    return this.hasType(this.MOVETYPE_INTERRUPTIBLE);
  }
  setInterruptible(b: any): void {
    if (b) this.setType(this.MOVETYPE_INTERRUPTIBLE);
    else this.clearType(this.MOVETYPE_INTERRUPTIBLE);
  }
  isVulnerable(): boolean {
    return this.hasType(this.MOVETYPE_VULNERABLE);
  }
  setVulnerable(b: any): void {
    if (b) this.setType(this.MOVETYPE_VULNERABLE);
    else this.clearType(this.MOVETYPE_VULNERABLE);
  }
  isInitOwnerDir(): boolean {
    return this.hasType(this.MOVETYPE_INIT_OWNER_DIR);
  }
  setInitOwnerDir(b: any): void {
    if (b) this.setType(this.MOVETYPE_INIT_OWNER_DIR);
    else this.clearType(this.MOVETYPE_INIT_OWNER_DIR);
  }
  usesProjectile(): boolean {
    return this.hasType(this.MOVETYPE_USES_PROJECTILE);
  }
  setUsesProjectile(b: any): void {
    if (b) this.setType(this.MOVETYPE_USES_PROJECTILE);
    else this.clearType(this.MOVETYPE_USES_PROJECTILE);
  }
  isImmobile(): boolean {
    return this.hasType(this.MOVETYPE_IMMOBILE);
  }
  setImmobile(b: any): void {
    if (b) this.setType(this.MOVETYPE_IMMOBILE);
    else this.clearType(this.MOVETYPE_IMMOBILE);
  }
  isMelee(): boolean {
    return this.hasType(this.MOVETYPE_MELEE);
  }
  setMelee(b: any): void {
    if (b) this.setType(this.MOVETYPE_MELEE);
    else this.clearType(this.MOVETYPE_MELEE);
  }

  getVisibleMember(): Member {
    return this.animation.getMember();
  }
  getAttackMaskMember(): Member {
    return this.attackMasks.get(this.animation.currIndex);
  }
  getDefenseMaskMember(): Member {
    return this.defenseMasks.get(this.animation.currIndex);
  }
  getFlipX(): number {
    return 0;
  }
  getFlipY(): number {
    return 0;
  }
  dirChanged(): void {}

  getAttackRect(): Rect {
    const me = lingoMe(this, Class_Move, 'getAttackRect');
    const m = me.getAttackMaskMember();
    if (m && m.number > 0) {
      const p = m.regPoint;
      return m.rect.sub(rect(p, p));
    }
    return rect(0, 0, 0, 0);
  }

  getDefenseRect(): Rect {
    const me = lingoMe(this, Class_Move, 'getDefenseRect');
    const m = me.getDefenseMaskMember();
    if (m && m.number > 0) {
      const p = m.regPoint;
      return m.rect.sub(rect(p, p));
    }
    return rect(0, 0, 0, 0);
  }

  hasHitOpponent(): number {
    return this.hitOpponent;
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) return 0;
    return 1;
  }

  getAge(): number {
    return this.age;
  }
}
