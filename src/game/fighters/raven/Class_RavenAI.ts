import { g, Point, list, random, abs } from '../../../runtime';
import { Class_AIAdapter } from '../Class_AIAdapter';

export class Class_RavenAI extends Class_AIAdapter {
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
        if (choice < 25) t.queueMove(g.MOVE_PUNCH, 0);
        else if (choice < 50) t.queueMove(g.MOVE_KICK, 0);
        else t.queueMove(g.MOVE_RAVEN_TELEKINETIC_SPIN, 0);
      } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 35) t.queueMove(g.MOVE_PUNCH, 0);
          else if (choice < 70) t.queueMove(g.MOVE_KICK, 0);
          else t.queueMove(g.MOVE_RAVEN_TELEKINETIC_SPIN, 0);
        } else if (choice < 25) t.queueMove(g.MOVE_PUNCH, 0);
        else if (choice < 50) t.queueMove(g.MOVE_KICK, 0);
        else if (choice < 75) t.queueMove(g.MOVE_RAVEN_TELEKINETIC_SPIN, 0);
        else t.queueMove(g.MOVE_RAVEN_EXPLOSIVE_DROP, 0);
      } else if (choice < 35) t.queueMove(g.MOVE_PUNCH, 0);
      else if (choice < 70) t.queueMove(g.MOVE_KICK, 0);
      else t.queueMove(g.MOVE_RAVEN_TELEKINETIC_SPIN, 0);
    } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
      // ORIGINAL BUG: signed diff.locH (no abs) here, so any opponent behind falls into the medium band.
      if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 35) t.queueMove(g.MOVE_PUNCH, 0);
          else if (choice < 70) t.queueMove(g.MOVE_KICK, 0);
          else t.queueMove(g.MOVE_RAVEN_TELEKINETIC_SPIN, 0);
        } else if (choice < 50) t.queueMove(g.MOVE_RAVEN_TELEKINETIC_THROW, 0);
        else t.queueMove(g.MOVE_RAVEN_EXPLOSIVE_DROP, 0);
      } else if (choice < 50) t.queueMove(g.MOVE_RAVEN_TELEKINETIC_THROW, 0);
      else t.queueMove(g.MOVE_RAVEN_EXPLOSIVE_DROP, 0);
    } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
      if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
        if (choice < 50) t.queueMove(g.MOVE_RAVEN_TELEKINETIC_THROW, 0);
        else t.queueMove(g.MOVE_RAVEN_EXPLOSIVE_DROP, 0);
      } else if (choice < 50) t.queueMove(g.MOVE_RAVEN_TELEKINETIC_THROW, 0);
      else t.queueMove(g.MOVE_RAVEN_EXPLOSIVE_DROP, 0);
    } else if (choice < 50) t.queueMove(g.MOVE_RAVEN_TELEKINETIC_THROW, 0);
    else t.queueMove(g.MOVE_RAVEN_EXPLOSIVE_DROP, 0);
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
          else t.queueMove(g.MOVE_STAND, 0);
        } else if (choice < 60) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
        else t.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
      } else if (choice < 25) t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
      else if (choice < 50) t.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
      else if (choice < 75) t.queueMove(g.MOVE_BLOCK, 0);
      else t.queueMove(g.MOVE_WALK_BACKWARD, 0);
    } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
      if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
          else if (choice < 90) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
          else t.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
        } else if (choice < 60) t.queueMove(g.MOVE_WALK_FORWARD, 0);
        else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
      } else if (choice < 35) t.queueMove(g.MOVE_WALK_FORWARD, 0);
      else if (choice < 50) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
      else if (choice < 85) t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
      else t.queueMove(g.MOVE_STAND, 0);
    } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
      if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
        if (choice < 60) t.queueMove(g.MOVE_WALK_FORWARD, 0);
        else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
      } else if (choice < 60) t.queueMove(g.MOVE_WALK_FORWARD, 0);
      else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
    } else if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
    else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
  }

  evadeMeleeAttack(_dist?: number): void {
    const choice = random(100) - 1;
    const t = this.target;
    if (this.targetAtSceneEdge) {
      if (choice < 85) t.queueMove(g.MOVE_BLOCK, 0);
      else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
    } else {
      // ORIGINAL BUG: choice is always < 100, so the jump branches below are unreachable.
      if (choice < 70) t.queueMove(g.MOVE_BLOCK, 0);
      else if (choice < 100) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
      else if (choice < 90) t.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
      else if (choice < 95) t.queueMove(g.MOVE_JUMP, 0);
      else t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
    }
  }

  evadeRangedAttack(attPos?: Point, attVel?: Point, framesLeft?: number): void {
    const P = attPos as Point;
    const V = attVel as Point;
    const choice = random(100) - 1;
    const t = this.target;
    const x = t.getPosX();
    const y = t.getPosY();
    const diffX = P.locH - x;
    const diffY = P.locV - y;
    void diffX;
    void diffY;
    // Velocities are floats (setVel stores floats), so this is float division.
    let slope: number;
    if (V.locH !== 0.0) slope = V.locV / V.locH;
    else slope = 999999.0;
    if (slope < 0.1) {
      if ((framesLeft as number) > 15) t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
      else t.queueMove(g.MOVE_BLOCK, 0);
    } else {
      const attackPoint = list(0.0, 0.0);
      if (g.util.getLineIntersection(x, y + 500.0, x, y - 500.0, P.locH + V.locH * -10.0, P.locV + V.locV * -10.0, P.locH + V.locH * 10.0, P.locV + V.locV * 10.0, attackPoint)) {
        const Ay = attackPoint.get(2);
        if (Ay < y + 10) {
          if (choice < 50) t.queueMove(g.MOVE_BLOCK, 0);
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

  moveToPlayer(): void {
    const choice = random(100) - 1;
    if (choice < 50) this.target.queueMove(g.MOVE_WALK_FORWARD, 0);
    else this.target.queueMove(g.MOVE_JUMP, this.targetCurrDir);
  }
}
