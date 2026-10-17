import { g, Point, random, abs } from '../runtime';
import { Class_AIAdapter } from './Class_AIAdapter';

export class Class_PlasmusAI extends Class_AIAdapter {
  constructor(obj: any) {
    super(obj);
    this.RANGE_THRESHOLD_X_SHORT = 180;
    this.RANGE_THRESHOLD_X_MEDIUM = 400;
    switch (g.difficulty) {
      case g.DIFFICULTY_BEGINNER:
        this.AGGRESSION_PERCENT_NORMAL = 30;
        this.AGGRESSION_PERCENT_ENRAGED = 50;
        break;
      case g.DIFFICULTY_INTERMEDIATE:
        this.AGGRESSION_PERCENT_NORMAL = 45;
        this.AGGRESSION_PERCENT_ENRAGED = 65;
        break;
      case g.DIFFICULTY_EXPERT:
        this.AGGRESSION_PERCENT_NORMAL = 70;
        this.AGGRESSION_PERCENT_ENRAGED = 80;
        break;
    }
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  selectAttackMove(): void {
    const diff = this.opponentCurrPos.sub(this.targetCurrPos);
    const choice = random(100) - 1;
    const t = this.target;
    if (abs(diff.locH) < this.RANGE_THRESHOLD_X_SHORT) {
      if (this.targetAtSceneEdge) {
        if (choice < 100) t.queueMove(g.MOVE_PLASMUS_ARM_SWIPE, 0);
      } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 100) t.queueMove(g.MOVE_PLASMUS_ARM_SWIPE, 0);
        } else if (choice < 25) t.queueMove(g.MOVE_PLASMUS_ARM_SWIPE, 0);
        else if (choice < 50) t.queueMove(g.MOVE_PLASMUS_SLUDGE_THROW, 0);
        else if (choice < 75) t.queueMove(g.MOVE_PLASMUS_CRAB_THROW, 0);
        else t.queueMove(g.MOVE_PLASMUS_CHEST_BLAST, 0);
      } else {
        if (choice < 100) t.queueMove(g.MOVE_PLASMUS_ARM_SWIPE, 0);
      }
    } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
      // Signed diff.locH (no abs) here, as in the Lingo: an opponent on the left always lands in this band.
      if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 40) t.queueMove(g.MOVE_PLASMUS_ARM_SWIPE, 0);
          else if (choice < 60) t.queueMove(g.MOVE_PLASMUS_SLUDGE_THROW, 0);
          else if (choice < 80) t.queueMove(g.MOVE_PLASMUS_CRAB_THROW, 0);
          else t.queueMove(g.MOVE_PLASMUS_CHEST_BLAST, 0);
        } else if (choice < 50) t.queueMove(g.MOVE_PLASMUS_CRAB_THROW, 0);
        else t.queueMove(g.MOVE_PLASMUS_CHEST_BLAST, 0);
      } else if (choice < 35) t.queueMove(g.MOVE_PLASMUS_SLUDGE_THROW, 0);
      else if (choice < 70) t.queueMove(g.MOVE_PLASMUS_CRAB_THROW, 0);
      else t.queueMove(g.MOVE_PLASMUS_CHEST_BLAST, 0);
    } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
      if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
        if (choice < 50) t.queueMove(g.MOVE_PLASMUS_SLUDGE_THROW, 0);
        else t.queueMove(g.MOVE_PLASMUS_CHEST_BLAST, 0);
      } else if (choice < 50) t.queueMove(g.MOVE_PLASMUS_CRAB_THROW, 0);
      else t.queueMove(g.MOVE_PLASMUS_CHEST_BLAST, 0);
    } else if (choice < 50) t.queueMove(g.MOVE_PLASMUS_CRAB_THROW, 0);
    else t.queueMove(g.MOVE_PLASMUS_CHEST_BLAST, 0);
  }

  selectPassiveMove(): void {
    const diff = this.opponentCurrPos.sub(this.targetCurrPos);
    const choice = random(100) - 1;
    const t = this.target;
    if (abs(diff.locH) < this.RANGE_THRESHOLD_X_SHORT) {
      if (this.targetAtSceneEdge) {
        if (choice < 100) t.queueMove(g.MOVE_BLOCK, 0);
      } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
          else t.queueMove(g.MOVE_STAND, 0);
        } else {
          if (choice < 100) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
        }
      } else if (choice < 50) t.queueMove(g.MOVE_BLOCK, 0);
      else t.queueMove(g.MOVE_WALK_BACKWARD, 0);
    } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
      if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
          else t.queueMove(g.MOVE_WALK_BACKWARD, 0);
        } else {
          if (choice < 100) t.queueMove(g.MOVE_WALK_FORWARD, 0);
        }
      } else if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
      else if (choice < 75) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
      else t.queueMove(g.MOVE_STAND, 0);
    } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
      if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
        if (choice < 100) t.queueMove(g.MOVE_WALK_FORWARD, 0);
      } else {
        if (choice < 100) t.queueMove(g.MOVE_WALK_FORWARD, 0);
      }
    } else {
      if (choice < 100) t.queueMove(g.MOVE_WALK_FORWARD, 0);
    }
  }

  evadeMeleeAttack(_dist?: number): void {
    const choice = random(100) - 1;
    if (this.targetAtSceneEdge) {
      if (choice < 100) this.target.queueMove(g.MOVE_BLOCK, 0);
    } else {
      if (choice < 100) this.target.queueMove(g.MOVE_BLOCK, 0);
    }
  }

  evadeRangedAttack(_attPos?: Point, _attVel?: Point, _framesLeft?: number): void {
    this.target.queueMove(g.MOVE_BLOCK, 0);
  }

  blockAttack(): void {
    this.target.queueMove(g.MOVE_BLOCK, 0);
  }

  moveToPlayer(): void {
    const choice = random(100) - 1;
    if (choice < 100) this.target.queueMove(g.MOVE_WALK_FORWARD, 0);
  }
}
