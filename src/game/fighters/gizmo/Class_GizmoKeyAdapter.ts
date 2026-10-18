import { g, list, point, voidp } from '../../../runtime';
import { Class_KeyAdapter } from '../Class_KeyAdapter';
import type { Class_KeyCombo } from '../Class_KeyCombo';
import type { KeyEvent } from '../../core/Class_KeyManager';

export class Class_GizmoKeyAdapter extends Class_KeyAdapter {
  cannonCombo: Class_KeyCombo;
  missileCombo: Class_KeyCombo;
  highMissileCombo: Class_KeyCombo;
  queuedCombo: any;

  constructor(obj: any) {
    super(obj);
    const C = g.classes.Class_KeyCombo;
    this.cannonCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_DOWN, this.KEYCOMBO_FORWARD, this.KEYCOMBO_PUNCH));
    this.missileCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_PUNCH));
    this.highMissileCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_BACKWARD, this.KEYCOMBO_PUNCH));
    this.queuedCombo = undefined;
  }

  destroy(): undefined {
    super.destroy();
    this.cannonCombo.destroy();
    this.missileCombo.destroy();
    this.highMissileCombo.destroy();
    return undefined;
  }

  reset(): void {
    super.reset();
    this.cannonCombo.reset();
    this.missileCombo.reset();
    this.highMissileCombo.reset();
  }

  checkCombo(event: KeyEvent, comboKey: number): void {
    const delay = event.timestamp - this.prevTimestamp;
    if (this.cannonCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) {
        if (this.target.isOnGround()) this.queuedCombo = g.MOVE_GIZMO_CANNON;
        else this.queuedCombo = g.MOVE_GIZMO_AIR_CANNON;
      }
    }
    if (this.highMissileCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) {
        if (!this.target.isOnGround()) this.queuedCombo = g.MOVE_GIZMO_HIGH_AIR_MISSILE;
      }
    }
    if (this.missileCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) {
        if (!this.target.isOnGround()) this.queuedCombo = g.MOVE_GIZMO_AIR_MISSILE;
      }
    }
  }

  // Unlike Class_RobinKeyAdapter.update, there is no `enabled` check here (as in the original).
  update(): void {
    this.updateKeys();
    const t = this.target;
    if (!voidp(this.queuedCombo)) {
      t.queueMove(this.queuedCombo);
      this.queuedCombo = undefined;
    } else if (t.isDoingMove()) {
      if (t.currMove === g.MOVE_JUMP || t.currMove === g.MOVE_GIZMO_AIR_JUMP) {
        if (this.hasState(this.KEYSTATE_MOVE_RIGHT)) {
          if (!t.isOnGround()) {
            t.accelerate(point(4.0, 0.0));
            if (t.getVelX() > g.JUMP_VELOCITY.locH) t.setVelX(g.JUMP_VELOCITY.locH);
          }
        } else if (this.hasState(this.KEYSTATE_MOVE_LEFT)) {
          if (!t.isOnGround()) {
            t.accelerate(point(-4.0, 0.0));
            if (t.getVelX() < -g.JUMP_VELOCITY.locH) t.setVelX(-g.JUMP_VELOCITY.locH);
          }
        }
      }
    } else if (t.isOnGround()) {
      if (this.hasState(this.KEYSTATE_MOVE_DOWN)) {
        t.queueMove(g.MOVE_BLOCK);
      } else if (this.hasState(this.KEYSTATE_PUNCH)) {
        t.queueMove(g.MOVE_PUNCH, 0);
        this.clearState(this.KEYSTATE_PUNCH);
      } else if (this.hasState(this.KEYSTATE_KICK)) {
        if (t.getPosY() === 0) {
          t.queueMove(g.MOVE_GIZMO_TAKE_OFF, 0);
          this.clearState(this.KEYSTATE_KICK);
        } else {
          t.moveBy(0, 2);
          t.queueMove(g.MOVE_FALL, 0);
          this.clearState(this.KEYSTATE_KICK);
        }
      } else if (this.hasState(this.KEYSTATE_MOVE_UP)) {
        t.queueMove(g.MOVE_JUMP);
      } else if (this.hasState(this.KEYSTATE_MOVE_RIGHT) && this.hasState(this.KEYSTATE_MOVE_LEFT)) {
        t.queueMove(g.MOVE_STAND);
      } else if (this.hasState(this.KEYSTATE_MOVE_RIGHT)) {
        if (t.getDir() < 0) t.queueMove(g.MOVE_WALK_BACKWARD);
        else t.queueMove(g.MOVE_WALK_FORWARD);
      } else if (this.hasState(this.KEYSTATE_MOVE_LEFT)) {
        if (t.getDir() < 0) t.queueMove(g.MOVE_WALK_FORWARD);
        else t.queueMove(g.MOVE_WALK_BACKWARD);
      } else {
        t.queueMove(g.MOVE_STAND);
      }
    } else if (this.hasState(this.KEYSTATE_MOVE_DOWN)) {
      t.queueMove(g.MOVE_GIZMO_AIR_BLOCK, 0);
    } else if (this.hasState(this.KEYSTATE_PUNCH)) {
      t.queueMove(g.MOVE_GIZMO_AIR_PUNCH, 0);
      this.clearState(this.KEYSTATE_PUNCH);
    } else if (this.hasState(this.KEYSTATE_KICK)) {
      t.queueMove(g.MOVE_GIZMO_LAND, 0);
      this.clearState(this.KEYSTATE_KICK);
    } else if (this.hasState(this.KEYSTATE_MOVE_UP)) {
      if (this.hasState(this.KEYSTATE_MOVE_RIGHT)) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, 1);
      else if (this.hasState(this.KEYSTATE_MOVE_LEFT)) t.queueMove(g.MOVE_GIZMO_AIR_JUMP, -1);
      else t.queueMove(g.MOVE_GIZMO_AIR_JUMP, 0);
    } else if (this.hasState(this.KEYSTATE_MOVE_RIGHT) && this.hasState(this.KEYSTATE_MOVE_LEFT)) {
      t.queueMove(g.MOVE_GIZMO_HOVER);
    } else if (this.hasState(this.KEYSTATE_MOVE_RIGHT)) {
      if (t.getDir() < 0) t.queueMove(g.MOVE_GIZMO_FLY_BACKWARD);
      else t.queueMove(g.MOVE_GIZMO_FLY_FORWARD);
    } else if (this.hasState(this.KEYSTATE_MOVE_LEFT)) {
      if (t.getDir() < 0) t.queueMove(g.MOVE_GIZMO_FLY_FORWARD);
      else t.queueMove(g.MOVE_GIZMO_FLY_BACKWARD);
    } else {
      t.queueMove(g.MOVE_GIZMO_HOVER);
    }
  }
}
