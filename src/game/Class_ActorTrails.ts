import { g, point, LList, integer, objectp, voidp } from '../runtime';

export class Class_ActorTrails {
  objList: LList<any>;
  zLoc: number;
  trailLength: number;
  blends: LList<number>;

  constructor(len: number, z: number) {
    this.trailLength = len;
    this.zLoc = z;
    this.objList = g.util.newArray(this.trailLength, undefined);
    this.blends = new LList();
    for (let i = 1; i <= this.trailLength; i++) this.blends.append(integer(i * (100.0 / (this.trailLength + 1))));
  }

  destroy(): undefined {
    for (const o of this.objList) if (objectp(o)) o.destroy();
    return undefined;
  }

  reset(): void {
    for (const o of this.objList) if (objectp(o)) o.destroy();
    this.objList = g.util.newArray(this.trailLength, undefined);
  }

  update(actorObj?: any): void {
    if (voidp(actorObj)) {
      this.objList.append(undefined);
    } else {
      this.objList.append(new g.classes.Class_StaticActor(actorObj.getSprite().member, this.zLoc, actorObj.pos, point(0.0, 0.0), actorObj.dir));
    }
    this.objList.deleteAt(1);
    for (let i = 1; i <= this.objList.count; i++) {
      const o = this.objList.get(i);
      if (!voidp(o)) {
        if (i === 1) {
          o.destroy();
          continue;
        }
        o.getSprite().blend = this.blends.get(i);
      }
    }
  }

  paint(): void {
    for (const o of this.objList) if (!voidp(o)) o.paint();
  }
}
