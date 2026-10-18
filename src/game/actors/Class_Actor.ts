import { g, Point, point, sprite, Sprite } from '../../runtime';

export class Class_Actor {
  pos: Point;
  vel: Point;
  dir: number;
  animation: any;
  visSprite: Sprite;

  constructor(initPos: Point, initVel: Point, initDir: number) {
    this.setPos(initPos);
    this.setVel(initVel);
    this.setDir(initDir);
    this.visSprite = sprite(0);
  }

  destroy(): undefined {
    return undefined;
  }

  update(): void {
    this.pos = this.pos.add(this.vel.mul(g.gameSpeed));
  }

  paint(): void {
    this.visSprite.loc = g.screen.scene.scenePosToStagePos(this.pos);
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

  getVel(): Point {
    return this.vel;
  }
  getVelX(): number {
    return this.vel.locH;
  }
  getVelY(): number {
    return this.vel.locV;
  }
  setVelX(x: number): void {
    this.vel.locH = x;
  }
  setVelY(y: number): void {
    this.vel.locV = y;
  }

  setVel(a1: Point | number, a2?: number): void {
    if (a1 instanceof Point) this.vel = point(a1.locH, a1.locV);
    else this.vel = point(a1, a2 ?? 0);
  }

  setDir(i: number): void {
    this.dir = i;
  }
  getDir(): number {
    return this.dir;
  }

  accelerate(a1: Point | number, a2?: number): void {
    if (a1 instanceof Point) this.vel = this.vel.add(a1.mul(g.gameSpeed));
    else this.vel = this.vel.add(point(a1, a2 ?? 0).mul(g.gameSpeed));
  }

  getSprite(): Sprite {
    return this.visSprite;
  }

  isOnScreen(): boolean {
    return this.pos.inside(g.game.scene.getViewRect());
  }
}
