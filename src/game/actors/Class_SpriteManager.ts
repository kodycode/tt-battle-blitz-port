import { g, LList, Sprite, sprite, member } from '../../runtime';

// Pool of puppet sprite channels [minChannel, maxChannel] handed out to game objects.
export class Class_SpriteManager {
  minChannel: number;
  maxChannel: number;
  chanIndex: number;
  channelsInUse: LList<number>;

  constructor(min: number, max: number) {
    this.minChannel = min;
    this.maxChannel = max;
    this.channelsInUse = g.util.newArray(this.maxChannel - this.minChannel + 1, 0);
    this.chanIndex = this.channelsInUse.count;
    for (let i = this.minChannel; i <= this.maxChannel; i++) sprite(i).visible = true;
  }

  destroy(): undefined {
    this.initAllChannels();
    return undefined;
  }

  initSprite(s: Sprite): void {
    s.width = 0;
    s.height = 0;
    s.blend = 100;
    s.ink = 0;
    s.visible = true;
    s.flipH = false;
    s.flipV = false;
    s.locZ = s.spriteNum;
    s.member = member(0);
    s.puppet = false;
  }

  initChannel(i: number): void {
    this.initSprite(sprite(i));
  }

  initAllChannels(): void {
    for (let i = this.minChannel; i <= this.maxChannel; i++) this.initChannel(i);
  }

  grabSprite(): Sprite {
    const startIndex = this.chanIndex;
    let done = 0;
    while (!done) {
      this.chanIndex = this.chanIndex + 1;
      if (this.chanIndex > this.channelsInUse.count) this.chanIndex = 1;
      if (this.chanIndex === startIndex) return sprite(0);
      if (!this.channelsInUse.get(this.chanIndex)) done = 1;
    }
    this.channelsInUse.set(this.chanIndex, 1);
    const s = sprite(this.minChannel + this.chanIndex - 1);
    s.puppet = true;
    return s;
  }

  releaseSprite(s: Sprite): void {
    // For sprite(0) (pool was exhausted) the Lingo index is negative; that write is harmless here.
    this.channelsInUse.set(s.spriteNum - this.minChannel + 1, 0);
    this.initSprite(s);
  }
}
