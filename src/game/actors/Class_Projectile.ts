import { g, Point, Rect, Member, LList, rect, sprite, voidp, integer, lingoMe } from '../../runtime';
import { Class_CollidableActor } from './Class_CollidableActor';

export class Class_Projectile extends Class_CollidableActor {
  owner: any;
  armed: number;
  attackDamage: number;
  stunDuration: number;
  alive: number;
  attackMasks: LList<Member>;
  age: number;
  hitOpponent: number;
  frozen: number;

  constructor(obj: any, initPos: Point, initVel: Point, initDir: number) {
    super(initPos, initVel, initDir);
    this.owner = obj;
    this.attackMasks = new LList();
    this.attackDamage = 0;
    this.stunDuration = 0;
    this.alive = 1;
    this.armed = 1;
    this.frozen = 0;
    this.hitOpponent = 0;
    this.age = 0;
    this.visSprite = g.game.spriteMgr.grabSprite();
    this.visSprite.locZ = g.SPRITE_LOCZ_PROJECTILES;
    this.visSprite.ink = g.INK_BGTRANSPARENT;
    this.visSprite.flipH = initDir < 0;
  }

  destroy(): undefined {
    const me = lingoMe(this, Class_Projectile, 'destroy');
    super.destroy();
    if (this.alive) me.kill();
    return undefined;
  }

  kill(): void {
    g.game.spriteMgr.releaseSprite(this.visSprite);
    this.visSprite = sprite(0);
    this.alive = 0;
  }

  isAlive(): number {
    return this.alive;
  }
  isArmed(): number {
    return this.armed;
  }
  setArmed(b: any): void {
    this.armed = b ? 1 : 0;
  }
  isFrozen(): number {
    return this.frozen;
  }
  setFrozen(b: any): void {
    this.frozen = b ? 1 : 0;
  }

  isOutOfPlay(): number {
    if (this.dir > 0) {
      if (this.getPosX() > g.game.scene.getViewRect().right + 100) return 1;
    } else {
      if (this.getPosX() < g.game.scene.getViewRect().left - 100) return 1;
    }
    return 0;
  }

  getAttackMaskMember(): Member {
    return this.attackMasks.get(this.animation.currIndex);
  }

  getAttackRect(): Rect {
    const me = lingoMe(this, Class_Projectile, 'getAttackRect');
    const m = me.getAttackMaskMember();
    if (m && m.number > 0) {
      const p = m.regPoint;
      return m.rect.sub(rect(p, p));
    }
    return rect(0, 0, 0, 0);
  }

  updateAttackBoundingBox(): void {
    const me = lingoMe(this, Class_Projectile, 'updateAttackBoundingBox');
    let r = me.getAttackRect();
    if (this.dir < 0) r = rect(-r.right, r.top, -r.left, r.bottom);
    // Director's rect.offset(h, v) coerces h and v to integers (round half away from zero) before adding.
    this.attBox = r.offset(integer(this.getPosX()), integer(this.getPosY()));
  }

  update(): void {
    const me = lingoMe(this, Class_Projectile, 'update');
    if (this.alive) {
      if (!this.frozen) {
        this.age = this.age + 1;
        me.setPos(this.pos.add(this.vel));
        if (!voidp(this.animation)) {
          if (this.age > 1) this.animation.advance();
          if (this.visSprite.spriteNum > 0) this.visSprite.member = this.animation.getMember();
          me.updateBoundingBoxes();
          if (this.animation.isDone()) me.kill();
        }
      }
    }
  }

  paint(): void {
    const p = g.screen.scene.scenePosToStagePos(this.pos);
    this.visSprite.loc = p;
  }

  processCollisions(): void {
    const me = lingoMe(this, Class_Projectile, 'processCollisions');
    if (!this.armed) return;
    for (let i = 1; i <= this.collisions.count; i++) {
      const target = this.collisions.get(i);
      if (target === this.owner.opponent) {
        if (!this.contactTable.hasObject(target)) {
          const damage = target.reactToCollision(this.attackDamage, this.stunDuration);
          this.hitOpponent = 1;
          const notBlocked = me.triggerPayoff();
          if (notBlocked) this.owner.awardPoints(damage);
          else this.owner.awardPoints(0);
        }
      }
      this.contactTable.addObject(target);
    }
    me.resetCollisions();
  }

  triggerPayoff(): number {
    const me = lingoMe(this, Class_Projectile, 'triggerPayoff');
    if (!this.alive) return 0;
    me.kill();
    return 0;
  }
}
