import { g, Point, LList, Member, point, list, idiv } from '../../runtime';

export class Class_HUDScore {
  SCORE_DIGIT_COUNT: number;
  DELTA_SCORE_RATE: number;
  scoreOverlays: LList<any>;
  scoreNumberMembers: LList<Member>;
  displayedScore: number;
  targetScore: number;
  scoreDivisors: LList<number>;

  constructor(initPos: Point) {
    this.SCORE_DIGIT_COUNT = 8;
    this.DELTA_SCORE_RATE = 350;
    const h = g.assets.hud;
    this.scoreNumberMembers = list(h.HUD_SCORE_NUMBER_0, h.HUD_SCORE_NUMBER_1, h.HUD_SCORE_NUMBER_2, h.HUD_SCORE_NUMBER_3, h.HUD_SCORE_NUMBER_4, h.HUD_SCORE_NUMBER_5, h.HUD_SCORE_NUMBER_6, h.HUD_SCORE_NUMBER_7, h.HUD_SCORE_NUMBER_8, h.HUD_SCORE_NUMBER_9);
    const digitOffset = point(-8, 0);
    this.scoreOverlays = new LList();
    for (let i = 1; i <= this.SCORE_DIGIT_COUNT; i++) {
      const o = new g.classes.Class_Overlay(initPos.add(digitOffset.mul(i - 1)), g.SPRITE_LOCZ_HUD_FG);
      this.scoreOverlays.append(o);
    }
    this.displayedScore = 0;
    this.targetScore = 0;
    this.scoreDivisors = new LList();
    let x = 1;
    for (let i = 1; i <= this.SCORE_DIGIT_COUNT + 1; i++) {
      this.scoreDivisors.append(x);
      x = x * 10;
    }
    this.updateOverlays();
  }

  destroy(): undefined {
    for (const o of this.scoreOverlays) o.destroy();
    return undefined;
  }

  updateOverlays(): void {
    let scoreDelta = this.targetScore - this.displayedScore;
    if (scoreDelta > this.DELTA_SCORE_RATE) scoreDelta = this.DELTA_SCORE_RATE;
    this.displayedScore = this.displayedScore + scoreDelta;
    for (let i = 1; i <= this.SCORE_DIGIT_COUNT; i++) {
      const o = this.scoreOverlays.get(i);
      // Integer division: (displayedScore mod 10^i) / 10^(i-1).
      const digit = idiv(this.displayedScore % this.scoreDivisors.get(i + 1), this.scoreDivisors.get(i));
      o.setMember(this.scoreNumberMembers.get(digit + 1));
    }
  }

  // Never called by the game. The Lingo sets the scores to the float 1.0 here; kept as-is.
  reset(): void {
    this.targetScore = 1.0;
    this.displayedScore = 1.0;
    this.updateOverlays();
  }

  update(): void {
    const newScore = g.game.getScore();
    if (newScore !== this.targetScore) this.targetScore = newScore;
    if (this.targetScore !== this.displayedScore) this.updateOverlays();
  }

  paint(): void {
    for (const o of this.scoreOverlays) o.paint();
  }
}
