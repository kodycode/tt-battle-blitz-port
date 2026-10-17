import { g, Point, point, random, abs, voidp, integer, lingoMe } from '../runtime';

export class Class_AIAdapter {
  CHOICE_DELAY_INITIAL_MIN: number;
  CHOICE_DELAY_INITIAL_MAX: number;
  CHOICE_DELAY_NORMAL_MIN: number;
  CHOICE_DELAY_NORMAL_MAX: number;
  CHOICE_DELAY_ENRAGED_MIN: number;
  CHOICE_DELAY_ENRAGED_MAX: number;
  CHOICE_DELAY_REBOUND_MIN: number;
  CHOICE_DELAY_REBOUND_MAX: number;
  EVASIVE_MOVE_DURATION: number;
  ASSESSMENT_DELAY_DEFAULT: number;
  LOOK_AHEAD_FRAMES: number;
  AWARENESS_PERCENT: number;
  OPPORTUNITY_PERCENT: number;
  COUNTER_ATTACK_PERCENT: number;
  AGGRESSION_PERCENT_NORMAL: number;
  AGGRESSION_PERCENT_ENRAGED: number;
  RANGE_THRESHOLD_X_SHORT: number;
  RANGE_THRESHOLD_X_MEDIUM: number;
  target: any;
  targetCurrMoveID: number;
  targetCurrDir: number;
  targetCurrPos: Point;
  targetCurrVel: Point;
  targetCurrBusy: any;
  targetPrevMoveID: number;
  targetPrevDir: number;
  targetPrevPos: Point;
  targetPrevVel: Point;
  targetPrevBusy: any;
  targetAtSceneEdge: boolean;
  targetAtScreenEdge: boolean;
  targetMove: any;
  opponentCurrPos: Point;
  opponentCurrVel: Point;
  opponentCurrMoveID: number;
  opponentCurrMoveNum: number;
  opponentPrevMoveNum: number;
  opponentCurrDir: number;
  opponentMove: any;
  lastChoiceAt: number;
  lastAssessmentAt: number;
  lastAssessmentMoveNum: number;
  assessmentDelay: number;
  choiceDelay: number;
  enabled: number;

  constructor(obj: any) {
    this.target = obj;
    this.RANGE_THRESHOLD_X_SHORT = 100;
    this.RANGE_THRESHOLD_X_MEDIUM = 350;
    this.LOOK_AHEAD_FRAMES = 20;
    switch (g.difficulty) {
      case g.DIFFICULTY_BEGINNER:
        this.CHOICE_DELAY_INITIAL_MIN = 30;
        this.CHOICE_DELAY_INITIAL_MAX = 45;
        this.CHOICE_DELAY_NORMAL_MIN = 30;
        this.CHOICE_DELAY_NORMAL_MAX = 90;
        this.CHOICE_DELAY_ENRAGED_MIN = 20;
        this.CHOICE_DELAY_ENRAGED_MAX = 40;
        this.CHOICE_DELAY_REBOUND_MIN = 25;
        this.CHOICE_DELAY_REBOUND_MAX = 45;
        this.EVASIVE_MOVE_DURATION = 30;
        this.AWARENESS_PERCENT = 10;
        this.COUNTER_ATTACK_PERCENT = 20;
        this.ASSESSMENT_DELAY_DEFAULT = 10;
        this.AGGRESSION_PERCENT_NORMAL = 20;
        this.AGGRESSION_PERCENT_ENRAGED = 40;
        break;
      case g.DIFFICULTY_INTERMEDIATE:
        this.CHOICE_DELAY_INITIAL_MIN = 15;
        this.CHOICE_DELAY_INITIAL_MAX = 45;
        this.CHOICE_DELAY_NORMAL_MIN = 20;
        this.CHOICE_DELAY_NORMAL_MAX = 60;
        this.CHOICE_DELAY_ENRAGED_MIN = 10;
        this.CHOICE_DELAY_ENRAGED_MAX = 40;
        this.CHOICE_DELAY_REBOUND_MIN = 15;
        this.CHOICE_DELAY_REBOUND_MAX = 30;
        this.EVASIVE_MOVE_DURATION = 20;
        this.AWARENESS_PERCENT = 50;
        this.COUNTER_ATTACK_PERCENT = 20;
        this.ASSESSMENT_DELAY_DEFAULT = 10;
        this.AGGRESSION_PERCENT_NORMAL = 40;
        this.AGGRESSION_PERCENT_ENRAGED = 60;
        break;
      case g.DIFFICULTY_EXPERT:
        this.CHOICE_DELAY_INITIAL_MIN = 5;
        this.CHOICE_DELAY_INITIAL_MAX = 45;
        this.CHOICE_DELAY_NORMAL_MIN = 10;
        this.CHOICE_DELAY_NORMAL_MAX = 30;
        this.CHOICE_DELAY_ENRAGED_MIN = 5;
        this.CHOICE_DELAY_ENRAGED_MAX = 20;
        this.CHOICE_DELAY_REBOUND_MIN = 0;
        this.CHOICE_DELAY_REBOUND_MAX = 10;
        this.EVASIVE_MOVE_DURATION = 15;
        this.AWARENESS_PERCENT = 90;
        this.COUNTER_ATTACK_PERCENT = 20;
        this.ASSESSMENT_DELAY_DEFAULT = 5;
        this.AGGRESSION_PERCENT_NORMAL = 60;
        this.AGGRESSION_PERCENT_ENRAGED = 80;
        break;
    }
    this.targetCurrMoveID = 0;
    this.targetCurrDir = 0;
    this.targetCurrPos = point(0, 0);
    this.targetCurrVel = point(0, 0);
    this.targetCurrBusy = 0;
    this.targetPrevMoveID = 0;
    this.targetPrevDir = 0;
    this.targetPrevPos = point(0, 0);
    this.targetPrevVel = point(0, 0);
    this.targetPrevBusy = 0;
    this.opponentCurrPos = point(0, 0);
    this.opponentCurrVel = point(0, 0);
    this.opponentCurrMoveID = 0;
    this.opponentCurrMoveNum = 0;
    this.opponentPrevMoveNum = 0;
    this.opponentCurrDir = 0;
    this.choiceDelay = this.CHOICE_DELAY_INITIAL_MAX;
    this.assessmentDelay = 0;
    this.lastChoiceAt = 0;
    this.lastAssessmentAt = 0;
    this.lastAssessmentMoveNum = 0;
    this.enabled = 1;
  }

  destroy(): undefined {
    return undefined;
  }

  reset(): void {
    this.choiceDelay = random(this.CHOICE_DELAY_INITIAL_MAX - this.CHOICE_DELAY_INITIAL_MIN) + this.CHOICE_DELAY_INITIAL_MIN;
    this.assessmentDelay = this.ASSESSMENT_DELAY_DEFAULT;
    this.lastChoiceAt = g.frameCount;
    this.lastAssessmentAt = g.frameCount;
    this.enabled = 1;
  }

  serviceCurrentMove(): void {}
  selectAttackMove(): void {}
  selectPassiveMove(): void {}
  evadeMeleeAttack(_dist?: number): void {}
  evadeRangedAttack(_attPos?: Point, _attVel?: Point, _framesLeft?: number): void {}
  blockAttack(): void {}
  counterAttack(_attPos?: Point, _attVel?: Point, _framesLeft?: number): void {}
  moveToPlayer(): void {}

  zeroDelays(): void {
    this.choiceDelay = 0;
    this.assessmentDelay = 0;
  }

  resetDelays(): void {
    let min: number, max: number;
    if (this.targetPrevMoveID === g.MOVE_UNDEFINED || this.targetPrevMoveID === g.MOVE_KNOCK_DOWN || this.targetPrevMoveID === g.MOVE_STUN || this.targetPrevMoveID === g.MOVE_BLOCK) {
      min = this.CHOICE_DELAY_REBOUND_MIN;
      max = this.CHOICE_DELAY_REBOUND_MAX;
    } else if (this.target.isEnraged()) {
      min = this.CHOICE_DELAY_ENRAGED_MIN;
      max = this.CHOICE_DELAY_ENRAGED_MAX;
    } else {
      min = this.CHOICE_DELAY_NORMAL_MIN;
      max = this.CHOICE_DELAY_NORMAL_MAX;
    }
    const range = max - min;
    if (range > 0) this.choiceDelay = random(max - min) + min;
    else this.choiceDelay = min;
    this.assessmentDelay = 0;
  }

  update(): void {
    const me = lingoMe(this, Class_AIAdapter, 'update');
    if (this.target.isFrozen()) return;
    if (!this.enabled) return;
    this.targetPrevMoveID = this.targetCurrMoveID;
    this.targetPrevDir = this.targetCurrDir;
    this.targetPrevPos = this.targetCurrPos;
    this.targetPrevVel = this.targetCurrVel;
    this.targetPrevBusy = this.targetCurrBusy;
    this.targetCurrMoveID = this.target.getMoveID();
    this.targetCurrDir = this.target.getDir();
    this.targetCurrPos = this.target.getPos();
    this.targetCurrVel = this.target.getVel();
    this.targetCurrBusy = this.target.isDoingMove();
    this.targetMove = this.target.getMove();
    this.opponentCurrPos = this.target.opponent.getPos();
    this.opponentCurrVel = this.target.opponent.getVel();
    this.opponentCurrMoveID = this.target.opponent.getMoveID();
    this.opponentMove = this.target.opponent.getMove();
    this.opponentPrevMoveNum = this.opponentCurrMoveNum;
    this.opponentCurrMoveNum = this.target.opponent.getMoveNumber();
    this.opponentCurrDir = this.target.opponent.getDir();
    if (this.targetCurrDir > 0) {
      this.targetAtSceneEdge = this.targetCurrPos.locH - g.game.scene.getBoundsMinX() < 100;
      this.targetAtScreenEdge = this.targetCurrPos.locH - g.game.scene.getViewRect().left < 50;
    } else {
      this.targetAtSceneEdge = g.game.scene.getBoundsMaxX() - this.targetCurrPos.locH < 100;
      this.targetAtScreenEdge = g.game.scene.getViewRect().right - this.targetCurrPos.locH < 50;
    }
    if (this.targetCurrBusy) return;
    if (this.targetPrevBusy) me.resetDelays();
    switch (this.targetCurrMoveID) {
      case g.MOVE_BLOCK:
        if (this.opponentMove.hasHitOpponent() || this.opponentCurrMoveNum !== this.opponentPrevMoveNum) me.resetDelays();
        break;
      case g.MOVE_WALK_BACKWARD:
        if (this.targetAtSceneEdge || this.targetAtScreenEdge) me.zeroDelays();
        break;
      case g.MOVE_WALK_FORWARD:
        if (abs(this.opponentCurrPos.locH - this.targetCurrPos.locH) <= this.RANGE_THRESHOLD_X_SHORT) me.zeroDelays();
        break;
      default:
        me.serviceCurrentMove();
    }
    if (g.frameCount >= this.lastAssessmentAt + this.assessmentDelay) {
      // canChoose is an uninitialised Lingo local (VOID, falsy) unless the move number changed.
      let canChoose: number | undefined;
      const oppMoveNum = this.target.opponent.getMoveNumber();
      if (oppMoveNum !== this.lastAssessmentMoveNum) {
        canChoose = 1;
        this.lastAssessmentAt = g.frameCount;
        if (random(100) - 1 < this.AWARENESS_PERCENT) {
          if (this.opponentMove.isAttack() && !this.opponentMove.hasHitOpponent()) {
            let attackingObj: any;
            if (this.opponentMove.usesProjectile()) {
              attackingObj = this.opponentMove.projectile;
              if (voidp(attackingObj)) attackingObj = this.target.opponent;
            } else {
              attackingObj = this.target.opponent;
            }
            const attVel = attackingObj.getVel();
            const attPos = attackingObj.getPos();
            if (this.opponentMove.isMelee()) {
              const dist = attPos.locH - this.target.getPosX();
              if (dist < 150) {
                me.evadeMeleeAttack(dist);
                canChoose = 0;
                this.lastChoiceAt = g.frameCount;
                this.assessmentDelay = this.EVASIVE_MOVE_DURATION;
                this.lastAssessmentMoveNum = oppMoveNum;
              }
            } else {
              const oppAttBox = attackingObj.getAttackBox();
              const tarDefBox = this.target.getDefenseBox();
              if (oppAttBox.width > 0) {
                let testBox = oppAttBox;
                for (let i = 0; i <= this.LOOK_AHEAD_FRAMES - 1; i++) {
                  // Director's rect.offset(h, v) coerces h and v to integers (round half away from zero).
                  testBox = testBox.offset(integer(attVel.locH), integer(attVel.locV));
                  if (!testBox.intersect(tarDefBox).isZero()) {
                    if (random(100) - 1 < this.COUNTER_ATTACK_PERCENT) me.counterAttack(attPos, attVel, i);
                    else me.evadeRangedAttack(attPos, attVel, i);
                    canChoose = 0;
                    this.lastChoiceAt = g.frameCount;
                    this.assessmentDelay = this.EVASIVE_MOVE_DURATION;
                    this.lastAssessmentMoveNum = oppMoveNum;
                    break;
                  }
                }
              }
            }
          }
        }
      }
      if (canChoose) {
        if (g.frameCount >= this.lastChoiceAt + this.choiceDelay) {
          if (this.targetAtScreenEdge) {
            me.moveToPlayer();
          } else {
            const threshold = this.target.isEnraged() ? this.AGGRESSION_PERCENT_ENRAGED : this.AGGRESSION_PERCENT_NORMAL;
            if (random(100) - 1 < threshold) me.selectAttackMove();
            else me.selectPassiveMove();
          }
          this.lastChoiceAt = g.frameCount;
        }
      }
    }
  }

  isEnabled(): number {
    return this.enabled;
  }

  setEnabled(b: any): void {
    this.enabled = b ? 1 : 0;
  }
}
