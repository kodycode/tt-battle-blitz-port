import { g, Point, Rect, rect, LList } from '../../runtime';
import { Class_AnimatedActor } from './Class_AnimatedActor';
import type { Class_ObjectTable } from '../core/Class_ObjectTable';

export class Class_CollidableActor extends Class_AnimatedActor {
  attBox: Rect;
  defBox: Rect;
  collisions: LList<any>;
  contactTable: Class_ObjectTable;

  constructor(initPos: Point, initVel: Point, initDir: number) {
    super(initPos, initVel, initDir);
    this.collisions = new LList();
    this.attBox = rect(0, 0, 0, 0);
    this.defBox = rect(0, 0, 0, 0);
    this.contactTable = new g.classes.Class_ObjectTable();
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  updateBoundingBoxes(): void {
    this.updateAttackBoundingBox();
    this.updateDefenseBoundingBox();
  }

  updateAttackBoundingBox(): void {}

  updateDefenseBoundingBox(): void {}

  collidesWith(actor: any): boolean {
    return !this.attBox.intersect(actor.defBox).isZero();
  }

  registerCollision(actor: any): void {
    this.collisions.append(actor);
  }

  processCollisions(): void {
    this.resetCollisions();
  }

  resetCollisions(): void {
    this.collisions = new LList();
  }

  reactToCollision(..._args: any[]): any {
    return undefined;
  }

  getAttackBox(): Rect {
    return this.attBox;
  }

  getDefenseBox(): Rect {
    return this.defBox;
  }
}
