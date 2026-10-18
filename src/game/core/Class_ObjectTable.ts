// Lingo property list keyed by object reference.
export class Class_ObjectTable {
  table: Map<any, number>;

  constructor() {
    this.table = new Map();
  }

  reset(): void {
    this.table = new Map();
  }

  addObject(o: any): void {
    this.table.set(o, (this.table.get(o) ?? 0) + 1);
  }

  hasObject(o: any): boolean {
    return this.table.has(o);
  }
}
