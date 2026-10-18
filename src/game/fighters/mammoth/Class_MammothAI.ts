import { g, Point, list, random, abs } from '../../../runtime';
import { Class_AIAdapter } from '../Class_AIAdapter';

export class Class_MammothAI extends Class_AIAdapter {
  constructor(obj: any) {
    super(obj);
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
        if (choice < 35) t.queueMove(g.MOVE_PUNCH, 0);
        else t.queueMove(g.MOVE_MAMMOTH_JUMP_PUNCH, 0);
      } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 35) t.queueMove(g.MOVE_PUNCH, 0);
          else t.queueMove(g.MOVE_MAMMOTH_JUMP_PUNCH, 0);
        } else {
          if (choice < 30) t.queueMove(g.MOVE_PUNCH, 0);
          else if (choice < 75) t.queueMove(g.MOVE_MAMMOTH_JUMP_PUNCH, 0);
          else t.queueMove(g.MOVE_MAMMOTH_SHOULDER_BARGE, 0);
        }
      } else {
        if (choice < 55) t.queueMove(g.MOVE_PUNCH, 0);
        else t.queueMove(g.MOVE_MAMMOTH_JUMP_PUNCH, 0);
      }
    } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
      // (diff.locH is signed here, unlike the abs() test above, as in the original.)
      if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 55) t.queueMove(g.MOVE_PUNCH, 0);
          else t.queueMove(g.MOVE_MAMMOTH_JUMP_PUNCH, 0);
        } else {
          if (choice < 50) t.queueMove(g.MOVE_MAMMOTH_SHOULDER_BARGE, 0);
          else t.queueMove(g.MOVE_MAMMOTH_GROUND_PUNCH, 0);
        }
      } else {
        if (choice < 50) t.queueMove(g.MOVE_MAMMOTH_SHOULDER_BARGE, 0);
        else t.queueMove(g.MOVE_MAMMOTH_GROUND_PUNCH, 0);
      }
    } else {
      if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 50) t.queueMove(g.MOVE_MAMMOTH_SHOULDER_BARGE, 0);
          else t.queueMove(g.MOVE_MAMMOTH_GROUND_PUNCH, 0);
        } else {
          if (choice < 50) t.queueMove(g.MOVE_MAMMOTH_SHOULDER_BARGE, 0);
          else t.queueMove(g.MOVE_MAMMOTH_GROUND_PUNCH, 0);
        }
      } else {
        if (choice < 50) t.queueMove(g.MOVE_MAMMOTH_SHOULDER_BARGE, 0);
        else t.queueMove(g.MOVE_MAMMOTH_GROUND_PUNCH, 0);
      }
    }
  }

  selectPassiveMove(): void {
    const diff = this.opponentCurrPos.sub(this.targetCurrPos);
    const choice = random(100) - 1;
    const t = this.target;
    if (abs(diff.locH) < this.RANGE_THRESHOLD_X_SHORT) {
      if (this.targetAtSceneEdge) {
        if (choice < 75) t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
        else t.queueMove(g.MOVE_BLOCK, 0);
      } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
          else t.queueMove(g.MOVE_STAND);
        } else {
          if (choice < 60) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
          else t.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
        }
      } else {
        if (choice < 25) t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
        else if (choice < 50) t.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
        else if (choice < 75) t.queueMove(g.MOVE_BLOCK, 0);
        else t.queueMove(g.MOVE_WALK_BACKWARD, 0);
      }
    } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
      if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
          else if (choice < 90) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
          else t.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
        } else {
          if (choice < 60) t.queueMove(g.MOVE_WALK_FORWARD, 0);
          else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
        }
      } else {
        if (choice < 35) t.queueMove(g.MOVE_WALK_FORWARD, 0);
        else if (choice < 50) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
        else if (choice < 85) t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
        else t.queueMove(g.MOVE_STAND, 0);
      }
    } else {
      if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 60) t.queueMove(g.MOVE_WALK_FORWARD, 0);
          else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
        } else {
          if (choice < 60) t.queueMove(g.MOVE_WALK_FORWARD, 0);
          else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
        }
      } else {
        if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
        else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
      }
    }
  }

  evadeMeleeAttack(_dist?: number): void {
    const choice = random(100) - 1;
    const t = this.target;
    if (this.targetAtSceneEdge) {
      if (choice < 85) t.queueMove(g.MOVE_BLOCK, 0);
      else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
    } else {
      if (choice < 70) t.queueMove(g.MOVE_BLOCK, 0);
      // ORIGINAL BUG: choice is 0..99, so `choice < 100` always wins and the jump branches are dead.
      else if (choice < 100) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
      else if (choice < 90) t.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
      else if (choice < 95) t.queueMove(g.MOVE_JUMP, 0);
      else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
    }
  }

  evadeRangedAttack(attPos: Point, attVel: Point, framesLeft: number): void {
    const choice = random(100) - 1;
    const t = this.target;
    const x = this.targetCurrPos.locH;
    const y = this.targetCurrPos.locV;
    // (Lingo also computes unused locals diffX = attPos.locH - x, diffY = attPos.locV - y.)
    let slope: number;
    // Velocities are floats: float division.
    if (attVel.locH !== 0.0) slope = attVel.locV / attVel.locH;
    else slope = 999999.0;
    if (slope < 0.1) {
      if (framesLeft > 15) t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
      else t.queueMove(g.MOVE_BLOCK, 0);
    } else {
      const attackPoint = list(0.0, 0.0);
      if (
        g.util.getLineIntersection(
          x,
          y + 500.0,
          x,
          y - 500.0,
          attPos.locH + attVel.locH * -10.0,
          attPos.locV + attVel.locV * -10.0,
          attPos.locH + attVel.locH * 10.0,
          attPos.locV + attVel.locV * 10.0,
          attackPoint,
        )
      ) {
        const Ay = attackPoint.get(2);
        if (Ay < y + 10) {
          if (choice < 80) t.queueMove(g.MOVE_BLOCK, 0);
          else t.queueMove(g.MOVE_WALK_FORWARD, 0);
        } else {
          if (choice < 50) t.queueMove(g.MOVE_BLOCK, 0);
          else if (choice < 60) t.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
          else if (choice < 80) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
          else t.queueMove(g.MOVE_JUMP, 0);
        }
      } else {
        t.queueMove(g.MOVE_BLOCK, 0);
      }
    }
  }

  blockAttack(): void {
    this.target.queueMove(g.MOVE_BLOCK, 0);
  }

  counterAttack(_attPos?: Point, _attVel?: Point, framesLeft?: number): void {
    // The unused `choice = random(100) - 1` still advances the RNG, as in the original.
    random(100);
    if ((framesLeft as number) < 15) this.target.queueMove(g.MOVE_PUNCH, 0);
    else this.target.queueMove(g.MOVE_MAMMOTH_JUMP_PUNCH, 0);
  }

  moveToPlayer(): void {
    const choice = random(100) - 1;
    if (choice < 50) this.target.queueMove(g.MOVE_WALK_FORWARD, 0);
    else this.target.queueMove(g.MOVE_JUMP, this.targetCurrDir);
  }
}
