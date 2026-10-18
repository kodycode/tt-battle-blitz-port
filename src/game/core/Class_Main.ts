import { g, LList, objectp, voidp, float, go, cursor, theMilliseconds } from '../../runtime';
import { runBusyWait } from '../../runtime/busywait';

export class Class_Main {
  audioMgr: any;
  keyMgr: any;
  screenList: LList<any>;
  screen: any;
  currScreenID: number;
  prevScreenID: number;

  constructor() {
    this.screenList = new LList();
    this.screenList.set(g.SCREEN_TITLE, new g.classes.Class_TitleScreen());
    this.screenList.set(g.SCREEN_INTRO, new g.classes.Class_IntroScreen());
    this.screenList.set(g.SCREEN_SELECTFIGHTER, new g.classes.Class_SelectFighterScreen());
    this.screenList.set(g.SCREEN_CONTROLS, new g.classes.Class_ControlsScreen());
    this.screenList.set(g.SCREEN_VERSUS, new g.classes.Class_VersusScreen());
    this.screenList.set(g.SCREEN_GAME, new g.classes.Class_GameScreen());
    this.screenList.set(g.SCREEN_WIN, new g.classes.Class_WinScreen());
    this.audioMgr = new g.classes.Class_AudioManager();
    this.keyMgr = new g.classes.Class_KeyManager();
    this.currScreenID = 0;
    this.prevScreenID = 0;
  }

  destroy(): undefined {
    for (let o of this.screenList) {
      if (objectp(o)) o = o.destroy();
    }
    this.audioMgr = this.audioMgr.destroy();
    this.keyMgr = this.keyMgr.destroy();
    return undefined;
  }

  loadScreen(s: number): void {
    this.prevScreenID = this.currScreenID;
    this.currScreenID = s;
    this.unloadScreen();
    this.screen = this.screenList.get(s);
    g.screen = this.screen;
    this.screen.load();
    cursor(-1);
  }

  unloadScreen(): void {
    if (!voidp(this.screen)) {
      this.screen.unload();
      this.screen = undefined;
      g.screen = undefined;
    }
  }

  update(): void {
    // The Lingo spins here (repeat while 1: audioMgr.update(); keyMgr.update(); exit once
    // the milliSeconds - g.frameTimestamp >= g.FRAME_DURATION_MIN). The port steps at a fixed 30 fps;
    // runBusyWait reproduces the spin's observable effects: key transitions polled at their own times
    // within the frame, and audio fades completing within the frame (see runtime/busywait.ts).
    runBusyWait(
      () => this.audioMgr.update(),
      () => this.keyMgr.update(),
    );
    const i = theMilliseconds();
    g.fps = 1.0 / (float(i - g.frameTimestamp) * 0.001);
    g.frameTimestamp = i;
    g.frameCount = g.frameCount + 1;
    if (objectp(this.screen)) this.screen.update();
  }

  paint(): void {
    if (objectp(this.screen)) this.screen.paint();
  }

  branch(): void {
    if (g.goFrame) {
      const i = g.goFrame;
      g.goFrame = 0;
      go(i);
    }
  }
}
