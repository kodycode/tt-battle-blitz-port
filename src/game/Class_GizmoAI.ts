import { g, Point, list, random, abs } from '../runtime';
import { Class_AIAdapter } from './Class_AIAdapter';

// Class_AIAdapter.update reaches the overrides below by normal dispatch (this class does not override update).
export class Class_GizmoAI extends Class_AIAdapter {
  constructor(obj: any) {
    super(obj);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  serviceCurrentMove(): void {
    switch (this.targetCurrMoveID) {
      case g.MOVE_GIZMO_AIR_BLOCK:
        if (this.opponentMove.hasHitOpponent() || this.opponentCurrMoveNum !== this.opponentPrevMoveNum) this.resetDelays();
        break;
      case g.MOVE_GIZMO_FLY_BACKWARD:
        if (this.targetAtSceneEdge || this.targetAtScreenEdge) this.zeroDelays();
        break;
      case g.MOVE_GIZMO_FLY_FORWARD:
        if (abs(this.opponentCurrPos.locH - this.targetCurrPos.locH) <= this.RANGE_THRESHOLD_X_SHORT) this.zeroDelays();
        break;
    }
  }

  // Many branches below are identical; kept exactly as in the original.
  selectAttackMove(): void {
    const diff = this.opponentCurrPos.sub(this.targetCurrPos);
    const choice = random(100) - 1;
    const t = this.target;
    if (t.isFlying()) {
      if (abs(diff.locH) < this.RANGE_THRESHOLD_X_SHORT) {
        if (this.targetAtSceneEdge) {
          if (choice < 100) t.queueMove(g.MOVE_GIZMO_AIR_CANNON, 0);
        } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 100) t.queueMove(g.MOVE_GIZMO_AIR_CANNON, 0);
          } else {
            if (choice < 100) t.queueMove(g.MOVE_GIZMO_AIR_CANNON, 0);
          }
        } else {
          if (choice < 100) t.queueMove(g.MOVE_GIZMO_AIR_CANNON, 0);
        }
      } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
        // (diff.locH is signed here, unlike the abs() test above, as in the original.)
        if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 50) t.queueMove(g.MOVE_GIZMO_AIR_CANNON, 0);
            else t.queueMove(g.MOVE_GIZMO_AIR_MISSILE, 0);
          } else {
            if (choice < 15) t.queueMove(g.MOVE_GIZMO_AIR_CANNON, 0);
            else if (choice < 45) t.queueMove(g.MOVE_GIZMO_AIR_MISSILE, 0);
            else t.queueMove(g.MOVE_GIZMO_HIGH_AIR_MISSILE, 0);
          }
        } else {
          if (choice < 20) t.queueMove(g.MOVE_GIZMO_AIR_CANNON, 0);
          else if (choice < 60) t.queueMove(g.MOVE_GIZMO_AIR_MISSILE, 0);
          else t.queueMove(g.MOVE_GIZMO_HIGH_AIR_MISSILE, 0);
        }
      } else {
        if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 20) t.queueMove(g.MOVE_GIZMO_AIR_CANNON, 0);
            else if (choice < 60) t.queueMove(g.MOVE_GIZMO_AIR_MISSILE, 0);
            else t.queueMove(g.MOVE_GIZMO_HIGH_AIR_MISSILE, 0);
          } else {
            if (choice < 40) t.queueMove(g.MOVE_GIZMO_AIR_CANNON, 0);
            else t.queueMove(g.MOVE_GIZMO_HIGH_AIR_MISSILE, 0);
          }
        } else {
          if (choice < 40) t.queueMove(g.MOVE_GIZMO_AIR_CANNON, 0);
          else t.queueMove(g.MOVE_GIZMO_HIGH_AIR_MISSILE, 0);
        }
      }
    } else {
      if (abs(diff.locH) < this.RANGE_THRESHOLD_X_SHORT) {
        if (this.targetAtSceneEdge) {
          if (choice < 100) t.queueMove(g.MOVE_GIZMO_CANNON, 0);
        } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 50) t.queueMove(g.MOVE_GIZMO_CANNON, 0);
            else t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
          } else {
            if (choice < 50) t.queueMove(g.MOVE_GIZMO_CANNON, 0);
            else t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
          }
        } else {
          if (choice < 50) t.queueMove(g.MOVE_GIZMO_CANNON, 0);
          else t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
        }
      } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
        if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 50) t.queueMove(g.MOVE_GIZMO_CANNON, 0);
            else t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
          } else {
            if (choice < 50) t.queueMove(g.MOVE_GIZMO_CANNON, 0);
            else t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
          }
        } else {
          if (choice < 50) t.queueMove(g.MOVE_GIZMO_CANNON, 0);
          else t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
        }
      } else {
        if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 50) t.queueMove(g.MOVE_GIZMO_CANNON, 0);
            else t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
          } else {
            if (choice < 50) t.queueMove(g.MOVE_GIZMO_CANNON, 0);
            else t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
          }
        } else {
          if (choice < 50) t.queueMove(g.MOVE_GIZMO_CANNON, 0);
          else t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
        }
      }
    }
  }

  selectPassiveMove(): void {
    const diff = this.opponentCurrPos.sub(this.targetCurrPos);
    const choice = random(100) - 1;
    const t = this.target;
    const d = this.targetCurrDir;
    if (t.isFlying()) {
      if (abs(diff.locH) < this.RANGE_THRESHOLD_X_SHORT) {
        if (this.targetAtSceneEdge) {
          if (choice < 75) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, d);
          else t.queueMove(g.MOVE_GIZMO_AIR_BLOCK, 0);
        } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 50) t.queueMove(g.MOVE_GIZMO_FLY_FORWARD, 0);
            else t.queueMove(g.MOVE_GIZMO_HOVER, 0);
          } else {
            if (choice < 60) t.queueMove(g.MOVE_GIZMO_FLY_BACKWARD, 0);
            else t.queueMove(g.MOVE_GIZMO_AIR_JUMP, -d);
          }
        } else {
          if (choice < 25) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, d);
          else if (choice < 50) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, -d);
          else if (choice < 75) t.queueMove(g.MOVE_GIZMO_AIR_BLOCK, 0);
          else t.queueMove(g.MOVE_GIZMO_FLY_BACKWARD, 0);
        }
      } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
        if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 40) t.queueMove(g.MOVE_GIZMO_FLY_FORWARD, 0);
            else if (choice < 80) t.queueMove(g.MOVE_GIZMO_FLY_BACKWARD, 0);
            else if (choice < 90) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, -d);
            else t.queueMove(g.MOVE_GIZMO_LAND, 0);
          } else {
            if (choice < 60) t.queueMove(g.MOVE_GIZMO_FLY_FORWARD, 0);
            else t.queueMove(g.MOVE_GIZMO_AIR_JUMP, d);
          }
        } else {
          if (choice < 35) t.queueMove(g.MOVE_GIZMO_FLY_FORWARD, 0);
          else if (choice < 50) t.queueMove(g.MOVE_GIZMO_FLY_BACKWARD, 0);
          else if (choice < 80) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, d);
          else if (choice < 90) t.queueMove(g.MOVE_GIZMO_HOVER, 0);
          else t.queueMove(g.MOVE_GIZMO_LAND, 0);
        }
      } else {
        if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 60) t.queueMove(g.MOVE_GIZMO_FLY_FORWARD, 0);
            else t.queueMove(g.MOVE_GIZMO_AIR_JUMP, d);
          } else {
            if (choice < 60) t.queueMove(g.MOVE_GIZMO_FLY_FORWARD, 0);
            else t.queueMove(g.MOVE_GIZMO_AIR_JUMP, d);
          }
        } else {
          if (choice < 50) t.queueMove(g.MOVE_GIZMO_FLY_FORWARD, 0);
          else t.queueMove(g.MOVE_GIZMO_AIR_JUMP, d);
        }
      }
    } else {
      if (abs(diff.locH) < this.RANGE_THRESHOLD_X_SHORT) {
        if (this.targetAtSceneEdge) {
          if (choice < 75) t.queueMove(g.MOVE_JUMP, d);
          else t.queueMove(g.MOVE_BLOCK, 0);
        } else if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
            else t.queueMove(g.MOVE_STAND, 0);
          } else {
            if (choice < 60) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
            else t.queueMove(g.MOVE_JUMP, -d);
          }
        } else {
          if (choice < 25) t.queueMove(g.MOVE_JUMP, d);
          else if (choice < 50) t.queueMove(g.MOVE_JUMP, -d);
          else if (choice < 75) t.queueMove(g.MOVE_BLOCK, 0);
          else t.queueMove(g.MOVE_WALK_BACKWARD, 0);
        }
      } else if (diff.locH < this.RANGE_THRESHOLD_X_MEDIUM) {
        if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
            else if (choice < 90) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
            else t.queueMove(g.MOVE_JUMP, -d);
          } else {
            if (choice < 60) t.queueMove(g.MOVE_WALK_FORWARD, 0);
            else t.queueMove(g.MOVE_JUMP, d);
          }
        } else {
          if (choice < 50) t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
          else if (choice < 75) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
          else if (choice < 95) t.queueMove(g.MOVE_JUMP, d);
          else t.queueMove(g.MOVE_STAND, 0);
        }
      } else {
        if (this.opponentCurrMoveID === g.MOVE_JUMP) {
          if (this.opponentCurrVel.locH * this.opponentCurrDir >= 0.0) {
            if (choice < 100) t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
          } else {
            if (choice < 100) t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
          }
        } else {
          if (choice < 100) t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
        }
      }
    }
  }

  evadeMeleeAttack(_dist?: number): void {
    const choice = random(100) - 1;
    const t = this.target;
    if (this.targetAtSceneEdge) {
      if (t.isFlying()) {
        if (choice < 70) t.queueMove(g.MOVE_GIZMO_AIR_BLOCK, 0);
        else t.queueMove(g.MOVE_GIZMO_AIR_JUMP, t.getDir());
      } else {
        if (choice < 70) t.queueMove(g.MOVE_BLOCK, 0);
        else t.queueMove(g.MOVE_JUMP, t.getDir());
      }
    } else if (t.isFlying()) {
      if (choice < 60) t.queueMove(g.MOVE_GIZMO_AIR_BLOCK, 0);
      else if (choice < 70) t.queueMove(g.MOVE_GIZMO_FLY_BACKWARD, 0);
      else if (choice < 80) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, -t.getDir());
      else if (choice < 90) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, 0);
      else t.queueMove(g.MOVE_GIZMO_AIR_JUMP, t.getDir());
    } else {
      if (choice < 60) t.queueMove(g.MOVE_BLOCK, 0);
      else if (choice < 70) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
      else if (choice < 90) t.queueMove(g.MOVE_JUMP, -t.getDir());
      // ORIGINAL BUG: repeats the `choice < 90` test, so the MOVE_JUMP 0 branch can never run.
      else if (choice < 90) t.queueMove(g.MOVE_JUMP, 0);
      else t.queueMove(g.MOVE_JUMP, t.getDir());
    }
  }

  evadeRangedAttack(attPos: Point, attVel: Point, framesLeft: number): void {
    const choice = random(100) - 1;
    const t = this.target;
    const x = t.getPosX();
    const y = t.getPosY();
    // (Lingo also computes unused locals diffX = attPos.locH - x, diffY = attPos.locV - y.)
    let slope: number;
    // Velocities assumed float: float division (integer division in Lingo if both components were integers).
    if (attVel.locH !== 0.0) slope = attVel.locV / attVel.locH;
    else slope = 999999.0;
    if (slope < 0.1) {
      if (t.isFlying()) {
        if (framesLeft > 15) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, this.targetCurrDir);
        else t.queueMove(g.MOVE_GIZMO_AIR_BLOCK, 0);
      } else {
        if (framesLeft > 15) t.queueMove(g.MOVE_JUMP, this.targetCurrDir);
        else t.queueMove(g.MOVE_BLOCK, 0);
      }
    } else {
      const attackPoint = list(0.0, 0.0);
      const b = g.util.getLineIntersection(
        x,
        y + 500.0,
        x,
        y - 500.0,
        attPos.locH + attVel.locH * -10.0,
        attPos.locV + attVel.locV * -10.0,
        attPos.locH + attVel.locH * 10.0,
        attPos.locV + attVel.locV * 10.0,
        attackPoint,
      );
      if (b) {
        const Ay = attackPoint.get(2);
        if (Ay < y + 10) {
          if (t.isFlying()) {
            if (choice < 50) t.queueMove(g.MOVE_GIZMO_AIR_BLOCK, 0);
            else t.queueMove(g.MOVE_GIZMO_FLY_FORWARD, 0);
          } else {
            if (choice < 50) t.queueMove(g.MOVE_BLOCK, 0);
            else t.queueMove(g.MOVE_WALK_FORWARD, 0);
          }
        } else if (t.isFlying()) {
          if (choice < 50) t.queueMove(g.MOVE_GIZMO_AIR_BLOCK, 0);
          else if (choice < 60) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, -this.targetCurrDir);
          else if (choice < 80) t.queueMove(g.MOVE_GIZMO_FLY_BACKWARD, 0);
          else t.queueMove(g.MOVE_GIZMO_AIR_JUMP, 0);
        } else {
          if (choice < 50) t.queueMove(g.MOVE_BLOCK, 0);
          else if (choice < 60) t.queueMove(g.MOVE_JUMP, -this.targetCurrDir);
          else if (choice < 80) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
          else t.queueMove(g.MOVE_JUMP, 0);
        }
      } else {
        this.blockAttack();
      }
    }
  }

  blockAttack(): void {
    const t = this.target;
    if (t.isFlying()) {
      if (this.targetAtScreenEdge || this.targetAtSceneEdge) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, this.targetCurrDir);
      else t.queueMove(g.MOVE_GIZMO_FLY_BACKWARD, 0);
    } else {
      t.queueMove(g.MOVE_BLOCK, 0);
    }
  }

  moveToPlayer(): void {
    const choice = random(100) - 1;
    const t = this.target;
    if (t.isFlying()) {
      if (choice < 50) t.queueMove(g.MOVE_GIZMO_FLY_FORWARD, 0);
      else t.queueMove(g.MOVE_GIZMO_AIR_JUMP, t.getDir());
    } else {
      if (choice < 70) t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
      // ORIGINAL BUG: `choice < 50` can never be true here (choice >= 70), so MOVE_WALK_FORWARD never runs.
      else if (choice < 50) t.queueMove(g.MOVE_WALK_FORWARD, 0);
      else t.queueMove(g.MOVE_JUMP, t.getDir());
    }
  }
}
