import { g, Point, point, random } from '../../runtime';
import { Class_DustPuffEffect } from './Class_DustPuffEffect';

// Three dust puffs flying apart: this object (ancestor Class_DustPuffEffect) plus two private puffs that are
// not in the game's effect group, so they are updated/painted/killed through this one.
export class Class_BlockedAttackEffect extends Class_DustPuffEffect {
  effect1: any;
  effect2: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, -initDir);
    this.effect1 = new g.classes.Class_DustPuffEffect(owner, initPos, initVel, -initDir);
    this.effect2 = new g.classes.Class_DustPuffEffect(owner, initPos, initVel, -initDir);
    this.setVel(point(random(150) / 10.0 - 2.0, random(150) / 10.0 - 2.0));
    this.effect1.setVel(point(random(150) / 10.0 - 2.0, random(150) / 10.0 - 2.0));
    this.effect2.setVel(point(random(150) / 10.0 - 2.0, random(150) / 10.0 - 2.0));
  }

  destroy(): undefined {
    super.destroy();
    this.effect1.destroy();
    this.effect2.destroy();
    return undefined;
  }

  update(): void {
    super.update();
    this.effect1.update();
    this.effect2.update();
  }

  kill(): void {
    super.kill();
    this.effect1.kill();
    this.effect2.kill();
  }

  paint(): void {
    super.paint();
    this.effect1.paint();
    this.effect2.paint();
  }
}
