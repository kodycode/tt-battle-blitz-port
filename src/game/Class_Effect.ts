import { g, Point, sprite, lingoMe } from '../runtime';
import { Class_Actor } from './Class_Actor';

export class Class_Effect extends Class_Actor {
  owner: any;
  state: any;
  alive: number;
  age: number;
  frozen: number;

  constructor(obj: any, initPos: Point, initVel: Point, initDir: number) {
    super(initPos, initVel, initDir);
    this.owner = obj;
    this.alive = 1;
    this.frozen = 0;
    this.age = 0;
    this.visSprite = g.game.spriteMgr.grabSprite();
    this.visSprite.locZ = g.SPRITE_LOCZ_EFFECTS_FOREGROUND;
    this.visSprite.ink = 36;
    this.visSprite.blend = 85;
    this.visSprite.flipH = initDir < 0;
  }

  destroy(): undefined {
    const me = lingoMe(this, Class_Effect, 'destroy');
    super.destroy();
    if (this.alive) me.kill();
    return undefined;
  }

  kill(): void {
    this.alive = 0;
    g.game.spriteMgr.releaseSprite(this.visSprite);
    this.visSprite = sprite(0);
  }

  isAlive(): number {
    return this.alive;
  }
  isFrozen(): number {
    return this.frozen;
  }
  setFrozen(b: any): void {
    this.frozen = b ? 1 : 0;
  }

  update(): void {
    const me = lingoMe(this, Class_Effect, 'update');
    if (this.alive) {
      if (!this.frozen) {
        this.age = this.age + 1;
        if (this.animation.isDone()) {
          me.kill();
        } else if (this.alive) {
          me.setPos(this.pos.add(this.vel));
          if (this.age > 1) this.animation.advance();
          if (this.visSprite.spriteNum > 0) this.visSprite.member = this.animation.getMember();
        }
      }
    }
  }
}
