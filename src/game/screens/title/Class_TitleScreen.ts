import { g, sprite, label, marker, theFrame, integer, runMode, voidp } from '../../../runtime';
import { Class_Screen } from '../Class_Screen';

// TODO(runtime): `the moviePath` / `the movieName` are not provided by the runtime.
const MOVIE_PATH = '';
const MOVIE_NAME = 'game.dir';

export class Class_TitleScreen extends Class_Screen {
  SCREENSTAGE_LOAD: number;
  SCREENSTAGE_WAIT: number;
  screenStage: number;
  initStage: number;
  delayFrames: number;
  preloader: any;

  constructor() {
    super();
    this.SCREENSTAGE_LOAD = 1;
    this.SCREENSTAGE_WAIT = 2;
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
    if (runMode.toLowerCase().includes('projector')) {
      this.screenStage = this.SCREENSTAGE_WAIT;
    } else {
      this.screenStage = this.SCREENSTAGE_LOAD;
    }
    this.initStage = 1;
    this.updateProgressBar(0.0);
  }

  unload(): void {
    this.loaded = 0;
    if (!voidp(this.preloader)) {
      this.preloader = this.preloader.destroy();
    }
  }

  updateProgressBar(ratio: number): void {
    const BAR_COUNT = 16;
    const bars = integer(ratio * BAR_COUNT);
    for (let i = 1; i <= BAR_COUNT; i++) {
      sprite(10 + i).visible = bars >= i;
    }
  }

  setStage(i: number): void {
    switch (i) {
      case this.SCREENSTAGE_LOAD:
        g.goFrame = label('SCREEN_TITLE');
        break;
      case this.SCREENSTAGE_WAIT:
        g.goFrame = label('SCREEN_TITLE_WAIT');
        break;
    }
    this.screenStage = i;
    this.initStage = 1;
  }

  advanceStage(): void {
    this.setStage(this.screenStage + 1);
  }

  update(): void {
    switch (this.screenStage) {
      case this.SCREENSTAGE_LOAD: {
        if (this.initStage) {
          this.initStage = 0;
          this.delayFrames = 10;
          this.preloader = new g.classes.Class_NetPreloader(MOVIE_PATH + MOVIE_NAME);
        }
        this.preloader.update();
        const ratio = this.preloader.getRatioLoaded();
        this.updateProgressBar(ratio);
        if (this.preloader.isDone()) {
          if (theFrame() === marker(1) - 1) {
            this.delayFrames = this.delayFrames - 1;
            if (this.delayFrames === 0) {
              this.preloader = this.preloader.destroy();
              this.advanceStage();
            }
          }
        }
        break;
      }
      case this.SCREENSTAGE_WAIT:
        if (this.initStage) {
          this.initStage = 0;
          let sharedCastURL: string;
          if (runMode.toLowerCase().includes('plugin')) {
            sharedCastURL = MOVIE_PATH + 'char_shared.cct';
          } else {
            sharedCastURL = MOVIE_PATH + 'char_shared.cst';
          }
          new g.classes.Class_NetPreloader(sharedCastURL);
        }
        break;
    }
  }
}
