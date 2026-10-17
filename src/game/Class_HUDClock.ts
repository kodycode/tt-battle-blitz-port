import { g, Point, LList, Member, point, list, idiv } from '../runtime';

export class Class_HUDClock {
  DIGIT_WIDTH: number;
  PIE_SLICE_COUNT: number;
  pos: Point;
  time: number;
  digitMembers: LList<Member>;
  pieOffMembers: LList<Member>;
  pieOnMembers: LList<Member>;
  digit1: any;
  digit2: any;
  pieSlices: LList<any>;
  secondsPerSlice: number;
  timeThresholds: LList<number>;

  constructor(initPos: Point) {
    this.pos = initPos;
    this.DIGIT_WIDTH = 16;
    this.PIE_SLICE_COUNT = 6;
    // Integer division (90 / 6).
    this.secondsPerSlice = idiv(g.ROUND_DURATION, this.PIE_SLICE_COUNT);
    this.timeThresholds = new LList();
    for (let i = 1; i <= this.PIE_SLICE_COUNT; i++) this.timeThresholds.append(g.ROUND_DURATION - i * this.secondsPerSlice);
    const h = g.assets.hud;
    this.digitMembers = list(h.HUD_CLOCK_NUM_0, h.HUD_CLOCK_NUM_1, h.HUD_CLOCK_NUM_2, h.HUD_CLOCK_NUM_3, h.HUD_CLOCK_NUM_4, h.HUD_CLOCK_NUM_5, h.HUD_CLOCK_NUM_6, h.HUD_CLOCK_NUM_7, h.HUD_CLOCK_NUM_8, h.HUD_CLOCK_NUM_9);
    this.digit1 = new g.classes.Class_Overlay(this.pos.add(point(idiv(this.DIGIT_WIDTH, 2), 0)), g.SPRITE_LOCZ_HUD_FG);
    this.digit2 = new g.classes.Class_Overlay(this.pos.add(point(idiv(-this.DIGIT_WIDTH, 2), 0)), g.SPRITE_LOCZ_HUD_FG);
    this.pieOffMembers = list(h.HUD_CLOCK_PIE_OFF_1, h.HUD_CLOCK_PIE_OFF_2, h.HUD_CLOCK_PIE_OFF_3, h.HUD_CLOCK_PIE_OFF_4, h.HUD_CLOCK_PIE_OFF_5, h.HUD_CLOCK_PIE_OFF_6);
    this.pieOnMembers = list(h.HUD_CLOCK_PIE_ON_1, h.HUD_CLOCK_PIE_ON_2, h.HUD_CLOCK_PIE_ON_3, h.HUD_CLOCK_PIE_ON_4, h.HUD_CLOCK_PIE_ON_5, h.HUD_CLOCK_PIE_ON_6);
    this.pieSlices = new LList();
    for (let i = 1; i <= this.PIE_SLICE_COUNT; i++) this.pieSlices.append(new g.classes.Class_Overlay(this.pos, g.SPRITE_LOCZ_HUD_BG));
    this.time = -1;
  }

  destroy(): undefined {
    for (const o of this.pieSlices) o.destroy();
    this.digit1.destroy();
    this.digit2.destroy();
    return undefined;
  }

  checkClock(newTime: number): void {
    if (newTime !== this.time) {
      this.time = newTime;
      this.buildClock();
    }
  }

  buildClock(): void {
    for (let i = 1; i <= this.PIE_SLICE_COUNT; i++) {
      if (this.time <= this.timeThresholds.get(i)) {
        this.pieSlices.get(i).setMember(this.pieOffMembers.get(i));
        continue;
      }
      this.pieSlices.get(i).setMember(this.pieOnMembers.get(i));
    }
    this.digit1.setMember(this.digitMembers.get((this.time % 10) + 1));
    // Integer division: (time / 10) mod 10.
    this.digit2.setMember(this.digitMembers.get((idiv(this.time, 10) % 10) + 1));
  }

  update(): void {
    this.checkClock(g.game.getTime());
  }

  paint(): void {}
}
