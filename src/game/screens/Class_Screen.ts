import { lingoMe } from '../../runtime';

export class Class_Screen {
  loaded: number;

  constructor() {
    this.loaded = 0;
  }

  destroy(): undefined {
    const me = lingoMe(this, Class_Screen, 'destroy');
    if (this.loaded) {
      me.unload();
    }
    return undefined;
  }

  load(): void {
    this.loaded = 0;
  }

  unload(): void {
    this.loaded = 0;
  }

  update(): void {}

  paint(): void {}
}
