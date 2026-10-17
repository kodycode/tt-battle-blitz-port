import { LList } from '../runtime';

export class Class_ObjectGroup {
  objList: LList<any>;

  constructor() {
    this.objList = new LList();
  }

  destroy(): undefined {
    return undefined;
  }

  addToGroup(obj: any): void {
    for (let i = 1; i <= this.objList.count; i++) {
      if (this.objList.get(i) === obj) return;
    }
    this.objList.append(obj);
  }

  removeFromGroup(obj: any): void {
    for (let i = 1; i <= this.objList.count; i++) {
      if (this.objList.get(i) === obj) {
        this.objList.deleteAt(i);
        return;
      }
    }
  }

  isInGroup(obj: any): number {
    for (let i = 1; i <= this.objList.count; i++) {
      if (this.objList.get(i) === obj) return 1;
    }
    return 0;
  }

  getList(): LList<any> {
    return this.objList;
  }

  reset(): void {
    this.objList = new LList();
  }

  getIndex(i: number): any {
    return this.objList.get(i);
  }

  getCount(): number {
    return this.objList.count;
  }
}
