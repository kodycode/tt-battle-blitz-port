import { g, Point, list, random, abs } from '../runtime';
import { Class_AIAdapter } from './Class_AIAdapter';

export class Class_StarfireAI extends Class_AIAdapter {
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
        else t.queueMove(g.MOVE_STARFIRE_FLYING_KNEE, 0);
      } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 35) t.queueMove(g.MOVE_PUNCH, 0);
          else if (choice < 70) t.queueMove(g.MOVE_KICK, 0);
          else t.queueMove(g.MOVE_STARFIRE_FLYING_KNEE, 0);
        } else if (choice < 25) t.queueMove(g.MOVE_PUNCH, 0);
        else if (choice < 50) t.queueMove(g.MOVE_KICK, 0);
        else if (choice < 75) t.queueMove(g.MOVE_STARFIRE_FLYING_KNEE, 0);
        else t.queueMove(g.MOVE_STARFIRE_ENERGY_BALL, 0);
      } else if (choice < 35) t.queueMove(g.MOVE_PUNCH, 0);
      else if (choice < 70) t.queueMove(g.MOVE_KICK, 0);
      else t.queueMove(g.MOVE_STARFIRE_FLYING_KNEE, 0);
    } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
      // Signed diff.locH (no abs) here, as in the Lingo.
      if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 35) t.queueMove(g.MOVE_PUNCH, 0);
          else if (choice < 70) t.queueMove(g.MOVE_KICK, 0);
          else t.queueMove(g.MOVE_STARFIRE_FLYING_KNEE, 0);
        } else if (choice < 50) t.queueMove(g.MOVE_STARFIRE_ENERGY_BALL, 0);
        else t.queueMove(g.MOVE_STARFIRE_BOLT_BARRAGE, 0);
      } else if (choice < 50) t.queueMove(g.MOVE_STARFIRE_ENERGY_BALL, 0);
      else t.queueMove(g.MOVE_STARFIRE_BOLT_BARRAGE, 0);
    } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
      if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
        if (choice < 50) t.queueMove(g.MOVE_STARFIRE_ENERGY_BALL, 0);
        else t.queueMove(g.MOVE_STARFIRE_BOLT_BARRAGE, 0);
      } else if (choice < 50) t.queueMove(g.MOVE_STARFIRE_ENERGY_BALL, 0);
      else t.queueMove(g.MOVE_STARFIRE_BOLT_BARRAGE, 0);
    } else if (choice < 50) t.queueMove(g.MOVE_STARFIRE_ENERGY_BALL, 0);
    else t.queueMove(g.MOVE_STARFIRE_BOLT_BARRAGE, 0);
  }

  selectPassiveMove(): void {
    const diff = this.opponentCurrPos.sub(this.targetCurrPos);
    const choice = random(100) - 1;
    const t = this.target;
    const d = this.targetCurrDir;
    if (abs(diff.locH) < this.RANGE_THRESHOLD_X_SHORT) {
      if (this.targetAtSceneEdge) {
        if (choice < 75) t.queueMove(g.MOVE_JUMP, d);
        else t.queueMove(g.MOVE_BLOCK, 0);
      } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
          else t.queueMove(g.MOVE_STAND, 0);
        } else if (choice < 60) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
        else t.queueMove(g.MOVE_JUMP, -d);
      } else if (choice < 25) t.queueMove(g.MOVE_JUMP, d);
      else if (choice < 50) t.queueMove(g.MOVE_JUMP, -d);
      else if (choice < 75) t.queueMove(g.MOVE_BLOCK, 0);
      else t.queueMove(g.MOVE_WALK_BACKWARD, 0);
    } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
      if (this.opponentCurrMoveID === g.MOVE_JUMP) {
        if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
          if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
          else if (choice < 90) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
          else t.queueMove(g.MOVE_JUMP, -d);
        } else if (choice < 60) t.queueMove(g.MOVE_WALK_FORWARD, 0);
        else t.queueMove(g.MOVE_JUMP, d);
      } else if (choice < 35) t.queueMove(g.MOVE_WALK_FORWARD, 0);
      else if (choice < 50) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
      else if (choice < 85) t.queueMove(g.MOVE_JUMP, d);
      else t.queueMove(g.MOVE_STAND, 0);
    } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
      if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
        if (choice < 60) t.queueMove(g.MOVE_WALK_FORWARD, 0);
        else t.queueMove(g.MOVE_JUMP, d);
      } else if (choice < 60) t.queueMove(g.MOVE_WALK_FORWARD, 0);
      else t.queueMove(g.MOVE_JUMP, d);
    } else if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
    else t.queueMove(g.MOVE_JUMP, d);
  }

  evadeMeleeAttack(_dist?: number): void {
    const choice = random(100) - 1;
    const t = this.target;
    const d = this.targetCurrDir;
    if (this.targetAtSceneEdge) {
      if (choice < 85) t.queueMove(g.MOVE_BLOCK, 0);
      else t.queueMove(g.MOVE_JUMP, d);
    } else if (choice < 70) t.queueMove(g.MOVE_BLOCK, 0);
    else if (choice < 100) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
    // ORIGINAL BUG: unreachable (choice is always < 100).
    else if (choice < 90) t.queueMove(g.MOVE_JUMP, -d);
    else if (choice < 95) t.queueMove(g.MOVE_JUMP, 0);
    else t.queueMove(g.MOVE_JUMP, d);
  }

  evadeRangedAttack(attPos: Point, attVel: Point, framesLeft: number): void {
    const choice = random(100) - 1;
    const x = this.target.getPosX();
    const y = this.target.getPosY();
    const diffX = attPos.locH - x;
    const diffY = attPos.locV - y;
    let slope: number;
    if (attVel.locH !== 0.0) slope = attVel.locV / attVel.locH;
    else slope = 999999.0;
    if (slope < 0.1) {
      if (framesLeft > 15) this.target.queueMove(g.MOVE_JUMP, this.targetCurrDir);
      else this.target.queueMove(g.MOVE_BLOCK, 0);
    } else {
      const attackPoint = list(0.0, 0.0);
      if (
        g.util.getLineIntersection(
          x, y + 500.0, x, y - 500.0,
          attPos.locH + attVel.locH * -10.0, attPos.locV + attVel.locV * -10.0,
          attPos.locH + attVel.locH * 10.0, attPos.locV + attVel.locV * 10.0,
          attackPoint,
        )
      ) {
        const Ay = attackPoint.get(2);
        if (Ay < y + 10) {
          if (choice < 50) this.target.queueMove(g.MOVE_BLOCK, 0);
          else this.target.queueMove(g.MOVE_WALK_FORWARD, 0);
        } else if (choice < 50) this.target.queueMove(g.MOVE_BLOCK, 0);
        else if (choice < 60) this.target.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
        else if (choice < 80) this.target.queueMove(g.MOVE_WALK_BACKWARD, 0);
        else this.target.queueMove(g.MOVE_JUMP, 0);
      } else {
        this.target.queueMove(g.MOVE_BLOCK, 0);
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
