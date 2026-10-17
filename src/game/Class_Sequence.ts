export class Class_Sequence {
  done: number;

  constructor() {
    this.done = 0;
  }

  destroy(): undefined {
    return undefined;
  }

  update(): void {}

  paint(): void {}

  isDone(): number {
    return this.done;
  }
}
