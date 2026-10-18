import { Class_Screen } from '../Class_Screen';

export class Class_ControlsScreen extends Class_Screen {
  SCREENSTAGE_INTRO: number;
  SCREENSTAGE_OUTRO: number;
  screenStage: number;
  initStage: number;
  delayFrames: number;

  constructor() {
    super();
    this.SCREENSTAGE_INTRO = 1;
    this.SCREENSTAGE_OUTRO = 2;
  }

  destroy(): undefined {
    if (this.loaded) {
      this.unload();
    }
    super.destroy();
    return undefined;
  }

  load(): void {
    this.loaded = 1;
  }

  unload(): void {
    this.loaded = 0;
  }

  update(): void {}
}
