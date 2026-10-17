import { g, label, marker, theFrame } from '../runtime';
import { Class_Screen } from './Class_Screen';

export class Class_IntroScreen extends Class_Screen {
  SCREENSTAGE_STEP_1: number;
  SCREENSTAGE_STEP_2: number;
  SCREENSTAGE_STEP_3: number;
  screenStage: number;
  initStage: number;
  delayFrames: number;

  constructor() {
    super();
    this.SCREENSTAGE_STEP_1 = 1;
    this.SCREENSTAGE_STEP_2 = 2;
    this.SCREENSTAGE_STEP_3 = 3;
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
    this.screenStage = this.SCREENSTAGE_STEP_1;
    this.initStage = 1;
  }

  unload(): void {
    this.loaded = 0;
  }

  setStage(i: number): void {
    switch (i) {
      case this.SCREENSTAGE_STEP_1:
        g.goFrame = label('SCREEN_INTRO');
        break;
      case this.SCREENSTAGE_STEP_2:
        g.goFrame = label('SCREEN_INTRO_STEP_2');
        break;
      case this.SCREENSTAGE_STEP_3:
        g.goFrame = label('SCREEN_INTRO_STEP_3');
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
      case this.SCREENSTAGE_STEP_1:
        if (this.initStage) {
          this.initStage = 0;
          g.main.audioMgr.playSound(g.assets.AUDIO.MUSIC_WHOLE_SONG, 70, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
        }
        break;
      case this.SCREENSTAGE_STEP_2:
        if (this.initStage) {
          this.initStage = 0;
        }
        break;
      case this.SCREENSTAGE_STEP_3:
        if (this.initStage) {
          this.initStage = 0;
        }
        if (theFrame() === marker(1) - 1) {
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_CHARACTERSWITCH3, 100, g.SFX_EVENT_PRIORITY_LOW);
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALL_SLAM, 100, g.SFX_EVENT_PRIORITY_LOW);
          g.goFrame = label('SCREEN_SELECTFIGHTER');
        }
        break;
    }
  }
}
