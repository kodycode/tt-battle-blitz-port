import { g, point, voidp, float, abs } from '../../runtime';
import { Class_Actor } from './Class_Actor';

export class Class_Shadow extends Class_Actor {
  owner: any;
  initWidth: number;
  initHeight: number;

  constructor(obj: any, width?: number) {
    super(point(0, 0), point(0, 0), 0);
    const mem = g.assets.CHAR_SHARED.FX_SHADOW;
    this.owner = obj;
    if (!voidp(width)) this.setWidth(width as number);
    else this.setWidth(100);
    this.visSprite = g.game.spriteMgr.grabSprite();
    this.visSprite.member = mem;
    this.visSprite.ink = g.INK_MATTE;
    this.visSprite.blend = 30;
    this.visSprite.locZ = g.SPRITE_LOCZ_SHADOWS;
  }

  destroy(): undefined {
    super.destroy();
    g.game.spriteMgr.releaseSprite(this.visSprite);
    return undefined;
  }

  calcScale(h: number): number {
    const scale = 1.0 - abs(h / 500.0);
    if (scale < 0.0) return 0.0;
    if (scale > 1000.0) return 1000.0;
    return scale;
  }

  update(): void {
    super.update();
    let scale: number;
    this.setPosX(this.owner.getPosX());
    // owner.handler(#isOnGround): does the owner respond to isOnGround?
    if (typeof this.owner.isOnGround === 'function') {
      if (this.owner.isOnGround()) {
        this.setPosY(this.owner.getPosY());
        scale = this.calcScale(0.0);
      } else {
        this.setPosY(0.0);
        scale = this.calcScale(this.owner.getPosY());
      }
    } else {
      this.setPosY(0.0);
      scale = this.calcScale(this.owner.getPosY());
    }
    // Lingo sprite width/height are integers: assignment truncates? Director rounds; keep integer().
    this.visSprite.width = Math.round(this.initWidth * scale);
    this.visSprite.height = Math.round(this.initHeight * scale);
  }

  setWidth(width: number): void {
    const mem = g.assets.CHAR_SHARED.FX_SHADOW;
    this.initWidth = width;
    this.initHeight = (mem.height * float(width)) / float(mem.width);
  }
}
