import { g, Point, point, Member, Sprite } from '../../runtime';

export class Class_Overlay {
  pos: Point;
  visSprite: Sprite;

  constructor(initPos: Point, initLocZ: number) {
    this.setPos(initPos);
    this.visSprite = g.game.spriteMgr.grabSprite();
    this.visSprite.loc = this.pos;
    this.visSprite.ink = 36;
    this.visSprite.locZ = initLocZ;
  }

  destroy(): undefined {
    g.game.spriteMgr.releaseSprite(this.visSprite);
    return undefined;
  }

  update(): void {}

  paint(): void {
    this.visSprite.loc = this.pos;
  }

  getPosX(): number {
    return this.pos.locH;
  }
  getPosY(): number {
    return this.pos.locV;
  }
  getPos(): Point {
    return this.pos;
  }
  setPosX(x: number): void {
    this.pos.locH = x;
  }
  setPosY(y: number): void {
    this.pos.locV = y;
  }
  setPos(a1: Point | number, a2?: number): void {
    if (a1 instanceof Point) this.pos = point(a1.locH, a1.locV);
    else this.pos = point(a1, a2 ?? 0);
  }
  moveBy(a1: Point | number, a2?: number): void {
    if (a1 instanceof Point) this.pos = this.pos.add(a1);
    else this.pos = this.pos.add(point(a1, a2 ?? 0));
  }
  getFlipX(): boolean {
    return this.visSprite.flipH;
  }
  setFlipX(b: any): void {
    this.visSprite.flipH = !!b;
  }
  getFlipY(): boolean {
    return this.visSprite.flipV;
  }
  setFlipY(b: any): void {
    this.visSprite.flipV = !!b;
  }
  setVisible(b: any): void {
    this.visSprite.visible = !!b;
  }
  isVisible(): boolean {
    return this.visSprite.visible;
  }
  getSprite(): Sprite {
    return this.visSprite;
  }
  setMember(mem: Member): void {
    this.visSprite.member = mem;
  }
  getMember(): Member {
    return this.visSprite.member;
  }
  setInk(i: number): void {
    this.visSprite.ink = i;
  }
  getInk(): number {
    return this.visSprite.ink;
  }
}
