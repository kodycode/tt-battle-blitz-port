import { g, Point, LList, Member, point, list, float } from '../../runtime';

export class Class_HUDHealthBar {
  HEALTHBAR_COLOR_GREEN: number;
  HEALTHBAR_COLOR_ORANGE: number;
  HEALTHBAR_COLOR_RED: number;
  HEALTHBAR_COLOR_WHITE: number;
  HEALTHBAR_SLICE_COUNT: number;
  HEALTHBAR_END_SLICE_COUNT: number;
  HEALTHBAR_MIDDLE_SLICE_COUNT: number;
  HEALTHBAR_SLICE_WIDTH: number;
  HEALTHBAR_HEIGHT: number;
  HEALTHBAR_DELTA_FILL_MAX: number;
  HEALTHBAR_HILITE_DURATION: number;
  source: any;
  pos: Point;
  dir: number;
  maxVal: number;
  endMembers: LList<LList<Member>>;
  middleMembers: LList<LList<Member>>;
  lowOverlay: any;
  middleOverlays: LList<any>;
  highOverlay: any;
  barColor: number;
  targetFill: number;
  displayFill: number;
  hiliteFrames: number;

  constructor(obj: any, initPos: Point, initFlipX: any) {
    this.source = obj;
    this.pos = initPos;
    this.maxVal = float(obj.getHealth());
    if (initFlipX) this.dir = -1;
    else this.dir = 1;
    this.HEALTHBAR_COLOR_GREEN = 1;
    this.HEALTHBAR_COLOR_ORANGE = 2;
    this.HEALTHBAR_COLOR_RED = 3;
    this.HEALTHBAR_COLOR_WHITE = 4;
    this.HEALTHBAR_SLICE_COUNT = 70;
    this.HEALTHBAR_END_SLICE_COUNT = 6;
    this.HEALTHBAR_MIDDLE_SLICE_COUNT = 10;
    this.HEALTHBAR_SLICE_WIDTH = 3;
    this.HEALTHBAR_HEIGHT = 19;
    this.HEALTHBAR_DELTA_FILL_MAX = 0.0143;
    this.HEALTHBAR_HILITE_DURATION = 8;
    const h = g.assets.hud;
    this.endMembers = new LList();
    this.endMembers.set(this.HEALTHBAR_COLOR_GREEN, list(h.HUD_LIFEBAR_END_GREEN_01, h.HUD_LIFEBAR_END_GREEN_02, h.HUD_LIFEBAR_END_GREEN_03, h.HUD_LIFEBAR_END_GREEN_04, h.HUD_LIFEBAR_END_GREEN_05, h.HUD_LIFEBAR_END_GREEN_06));
    this.endMembers.set(this.HEALTHBAR_COLOR_ORANGE, list(h.HUD_LIFEBAR_END_ORANGE_01, h.HUD_LIFEBAR_END_ORANGE_02, h.HUD_LIFEBAR_END_ORANGE_03, h.HUD_LIFEBAR_END_ORANGE_04, h.HUD_LIFEBAR_END_ORANGE_05, h.HUD_LIFEBAR_END_ORANGE_06));
    this.endMembers.set(this.HEALTHBAR_COLOR_RED, list(h.HUD_LIFEBAR_END_RED_01, h.HUD_LIFEBAR_END_RED_02, h.HUD_LIFEBAR_END_RED_03, h.HUD_LIFEBAR_END_RED_04, h.HUD_LIFEBAR_END_RED_05, h.HUD_LIFEBAR_END_RED_06));
    this.endMembers.set(this.HEALTHBAR_COLOR_WHITE, list(h.HUD_LIFEBAR_END_WHITE_01, h.HUD_LIFEBAR_END_WHITE_02, h.HUD_LIFEBAR_END_WHITE_03, h.HUD_LIFEBAR_END_WHITE_04, h.HUD_LIFEBAR_END_WHITE_05, h.HUD_LIFEBAR_END_WHITE_06));
    this.middleMembers = new LList();
    this.middleMembers.set(this.HEALTHBAR_COLOR_GREEN, list(h.HUD_LIFEBAR_MIDDLE_GREEN_01, h.HUD_LIFEBAR_MIDDLE_GREEN_02, h.HUD_LIFEBAR_MIDDLE_GREEN_03, h.HUD_LIFEBAR_MIDDLE_GREEN_04, h.HUD_LIFEBAR_MIDDLE_GREEN_05, h.HUD_LIFEBAR_MIDDLE_GREEN_06, h.HUD_LIFEBAR_MIDDLE_GREEN_07, h.HUD_LIFEBAR_MIDDLE_GREEN_08, h.HUD_LIFEBAR_MIDDLE_GREEN_09, h.HUD_LIFEBAR_MIDDLE_GREEN_10));
    this.middleMembers.set(this.HEALTHBAR_COLOR_ORANGE, list(h.HUD_LIFEBAR_MIDDLE_ORANGE_01, h.HUD_LIFEBAR_MIDDLE_ORANGE_02, h.HUD_LIFEBAR_MIDDLE_ORANGE_03, h.HUD_LIFEBAR_MIDDLE_ORANGE_04, h.HUD_LIFEBAR_MIDDLE_ORANGE_05, h.HUD_LIFEBAR_MIDDLE_ORANGE_06, h.HUD_LIFEBAR_MIDDLE_ORANGE_07, h.HUD_LIFEBAR_MIDDLE_ORANGE_08, h.HUD_LIFEBAR_MIDDLE_ORANGE_09, h.HUD_LIFEBAR_MIDDLE_ORANGE_10));
    this.middleMembers.set(this.HEALTHBAR_COLOR_RED, list(h.HUD_LIFEBAR_MIDDLE_RED_01, h.HUD_LIFEBAR_MIDDLE_RED_02, h.HUD_LIFEBAR_MIDDLE_RED_03, h.HUD_LIFEBAR_MIDDLE_RED_04, h.HUD_LIFEBAR_MIDDLE_RED_05, h.HUD_LIFEBAR_MIDDLE_RED_06, h.HUD_LIFEBAR_MIDDLE_RED_07, h.HUD_LIFEBAR_MIDDLE_RED_08, h.HUD_LIFEBAR_MIDDLE_RED_09, h.HUD_LIFEBAR_MIDDLE_RED_10));
    this.middleMembers.set(this.HEALTHBAR_COLOR_WHITE, list(h.HUD_LIFEBAR_MIDDLE_WHITE_01, h.HUD_LIFEBAR_MIDDLE_WHITE_02, h.HUD_LIFEBAR_MIDDLE_WHITE_03, h.HUD_LIFEBAR_MIDDLE_WHITE_04, h.HUD_LIFEBAR_MIDDLE_WHITE_05, h.HUD_LIFEBAR_MIDDLE_WHITE_06, h.HUD_LIFEBAR_MIDDLE_WHITE_07, h.HUD_LIFEBAR_MIDDLE_WHITE_08, h.HUD_LIFEBAR_MIDDLE_WHITE_09, h.HUD_LIFEBAR_MIDDLE_WHITE_10));
    this.barColor = this.HEALTHBAR_COLOR_GREEN;
    this.lowOverlay = new g.classes.Class_Overlay(initPos, g.SPRITE_LOCZ_HUD_BG);
    this.lowOverlay.setFlipX(initFlipX);
    this.middleOverlays = new LList();
    for (let i = 0; i <= 6; i++) {
      const o = new g.classes.Class_Overlay(initPos.add(point(this.dir * (this.HEALTHBAR_HEIGHT + i * 10 * this.HEALTHBAR_SLICE_WIDTH), 0)), g.SPRITE_LOCZ_HUD_BG);
      o.setFlipX(initFlipX);
      this.middleOverlays.append(o);
    }
    this.highOverlay = new g.classes.Class_Overlay(initPos, g.SPRITE_LOCZ_HUD_BG);
    this.highOverlay.setFlipX(!initFlipX);
    this.highOverlay.setFlipY(1);
    this.targetFill = 1.0;
    this.displayFill = 1.0;
    this.hiliteFrames = 0;
    this.buildBar();
  }

  destroy(): undefined {
    this.lowOverlay.destroy();
    for (const o of this.middleOverlays) o.destroy();
    this.highOverlay.destroy();
    return undefined;
  }

  checkBar(health: number): void {
    const newTarget = float(health) / this.maxVal;
    if (newTarget !== this.targetFill) {
      this.targetFill = newTarget;
      this.hiliteFrames = this.HEALTHBAR_HILITE_DURATION;
    }
    if (this.hiliteFrames) {
      this.hiliteFrames = this.hiliteFrames - 1;
      this.buildBar();
    } else if (this.targetFill !== this.displayFill) {
      this.buildBar();
    }
  }

  buildBar(): void {
    let fillDelta = this.targetFill - this.displayFill;
    if (fillDelta < -this.HEALTHBAR_DELTA_FILL_MAX) fillDelta = -this.HEALTHBAR_DELTA_FILL_MAX;
    else if (fillDelta > this.HEALTHBAR_DELTA_FILL_MAX) fillDelta = this.HEALTHBAR_DELTA_FILL_MAX;
    this.displayFill = this.displayFill + fillDelta;
    if (this.hiliteFrames) this.barColor = this.HEALTHBAR_COLOR_WHITE;
    else if (this.displayFill > 0.66) this.barColor = this.HEALTHBAR_COLOR_GREEN;
    else if (this.displayFill > 0.33) this.barColor = this.HEALTHBAR_COLOR_ORANGE;
    else this.barColor = this.HEALTHBAR_COLOR_RED;
    const slices = g.util.ceiling(this.displayFill * this.HEALTHBAR_SLICE_COUNT);
    let index = slices;
    if (index <= 0) {
      this.lowOverlay.setVisible(0);
      this.highOverlay.setVisible(0);
    } else {
      this.lowOverlay.setVisible(1);
      this.highOverlay.setVisible(1);
      if (index > this.HEALTHBAR_END_SLICE_COUNT) index = this.HEALTHBAR_END_SLICE_COUNT;
      this.lowOverlay.setMember(this.endMembers.get(this.barColor).get(index));
      this.highOverlay.setMember(this.endMembers.get(this.barColor).get(index));
    }
    this.highOverlay.setPos(this.pos.add(point(this.dir * (slices * this.HEALTHBAR_SLICE_WIDTH + this.HEALTHBAR_HEIGHT + 1), this.HEALTHBAR_HEIGHT + 1)));
    for (let i = 0; i <= this.middleOverlays.count - 1; i++) {
      const o = this.middleOverlays.get(i + 1);
      index = slices - this.HEALTHBAR_END_SLICE_COUNT - 10 * i;
      if (index <= 0) {
        o.setVisible(0);
        continue;
      }
      o.setVisible(1);
      if (index > 10) index = 10;
      o.setMember(this.middleMembers.get(this.barColor).get(index));
    }
  }

  reset(): void {
    this.targetFill = 1.0;
    this.displayFill = 1.0;
    this.hiliteFrames = 0;
    this.buildBar();
  }

  update(): void {
    this.checkBar(this.source.getHealth());
  }

  paint(): void {
    this.lowOverlay.paint();
    for (const o of this.middleOverlays) o.paint();
    this.highOverlay.paint();
  }
}
