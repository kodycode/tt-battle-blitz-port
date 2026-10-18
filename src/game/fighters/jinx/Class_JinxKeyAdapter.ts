import { g, list, point, voidp } from '../../../runtime';
import { Class_KeyAdapter } from '../Class_KeyAdapter';
import type { Class_KeyCombo } from '../Class_KeyCombo';
import type { KeyEvent } from '../../core/Class_KeyManager';

export class Class_JinxKeyAdapter extends Class_KeyAdapter {
  energySpinCombo: Class_KeyCombo;
  energyBallCombo: Class_KeyCombo;
  powerKickCombo: Class_KeyCombo;
  queuedCombo: any;

  constructor(obj: any) {
    super(obj);
    const C = g.classes.Class_KeyCombo;
    this.energySpinCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_KICK));
    this.energyBallCombo = new C(list(this.KEYCOMBO_DOWN, this.KEYCOMBO_BACKWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_PUNCH));
    this.powerKickCombo = new C(list(this.KEYCOMBO_FORWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_KICK));
    this.queuedCombo = undefined;
  }

  destroy(): undefined {
    super.destroy();
    this.energySpinCombo.destroy();
    this.energyBallCombo.destroy();
    this.powerKickCombo.destroy();
    return undefined;
  }

  reset(): void {
    super.reset();
    this.energySpinCombo.reset();
    this.energyBallCombo.reset();
    this.powerKickCombo.reset();
  }

  checkCombo(event: KeyEvent, comboKey: number): void {
    const delay = event.timestamp - this.prevTimestamp;
    if (this.energySpinCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_JINX_ENERGY_SPIN;
    }
    if (this.energyBallCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_JINX_ENERGY_BALL;
    }
    if (this.powerKickCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_JINX_POWER_KICK;
    }
  }

  // Unlike the titan adapters, the original does not check `enabled` here.
  update(): void {
    this.updateKeys();
    const t = this.target;
    if (!voidp(this.queuedCombo)) {
      t.queueMove(this.queuedCombo);
      this.queuedCombo = undefined;
    } else if (t.isDoingMove()) {
      if (t.currMove === g.MOVE_JUMP) {
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
    } else if (this.hasState(this.KEYSTATE_MOVE_DOWN)) {
      t.queueMove(g.MOVE_BLOCK, 0);
    } else if (this.hasState(this.KEYSTATE_PUNCH)) {
      t.queueMove(g.MOVE_PUNCH, 0);
      this.clearState(this.KEYSTATE_PUNCH);
    } else if (this.hasState(this.KEYSTATE_KICK)) {
      t.queueMove(g.MOVE_KICK, 0);
      this.clearState(this.KEYSTATE_KICK);
    } else if (this.hasState(this.KEYSTATE_MOVE_UP)) {
      if (this.hasState(this.KEYSTATE_MOVE_RIGHT)) t.queueMove(g.MOVE_JUMP, 1);
      else if (this.hasState(this.KEYSTATE_MOVE_LEFT)) t.queueMove(g.MOVE_JUMP, -1);
      else t.queueMove(g.MOVE_JUMP, 0);
      this.clearState(this.KEYSTATE_MOVE_UP);
    } else if (this.hasState(this.KEYSTATE_MOVE_RIGHT) && this.hasState(this.KEYSTATE_MOVE_LEFT)) {
      t.queueMove(g.MOVE_STAND, 0);
    } else if (this.hasState(this.KEYSTATE_MOVE_RIGHT)) {
      if (t.getDir() < 0) t.queueMove(g.MOVE_WALK_BACKWARD, 0);
      else t.queueMove(g.MOVE_WALK_FORWARD, 0);
    } else if (this.hasState(this.KEYSTATE_MOVE_LEFT)) {
      if (t.getDir() < 0) t.queueMove(g.MOVE_WALK_FORWARD, 0);
      else t.queueMove(g.MOVE_WALK_BACKWARD, 0);
    } else {
      t.queueMove(g.MOVE_STAND, 0);
    }
  }
}
