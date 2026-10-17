import { g, list, point, voidp } from '../runtime';
import { Class_KeyAdapter } from './Class_KeyAdapter';
import type { Class_KeyCombo } from './Class_KeyCombo';
import type { KeyEvent } from './Class_KeyManager';

export class Class_CyborgKeyAdapter extends Class_KeyAdapter {
  sonicCannonCombo: Class_KeyCombo;
  smashCombo: Class_KeyCombo;
  flyingKneeCombo: Class_KeyCombo;
  queuedCombo: any;
  queuedComboArg: any;

  constructor(obj: any) {
    super(obj);
    const C = g.classes.Class_KeyCombo;
    this.sonicCannonCombo = new C(list(this.KEYCOMBO_DOWN, this.KEYCOMBO_FORWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_PUNCH));
    this.smashCombo = new C(list(this.KEYCOMBO_DOWN, this.KEYCOMBO_DOWN, this.KEYCOMBO_UP));
    this.flyingKneeCombo = new C(list(this.KEYCOMBO_DOWN, this.KEYCOMBO_FORWARD, this.KEYCOMBO_KICK));
    this.queuedCombo = undefined;
  }

  destroy(): undefined {
    super.destroy();
    this.sonicCannonCombo.destroy();
    this.smashCombo.destroy();
    this.flyingKneeCombo.destroy();
    return undefined;
  }

  reset(): void {
    super.reset();
    this.sonicCannonCombo.reset();
    this.smashCombo.reset();
    this.flyingKneeCombo.reset();
  }

  checkCombo(event: KeyEvent, comboKey: number): void {
    const delay = event.timestamp - this.prevTimestamp;
    if (this.sonicCannonCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_CYBORG_SONIC_CANNON;
    }
    // smashCombo queues the cyber stomp and flyingKneeCombo the power smash, as in the original.
    if (this.smashCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_CYBORG_CYBER_STOMP;
    }
    if (this.flyingKneeCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_CYBORG_POWER_SMASH;
    }
    const summons: [Class_KeyCombo, number][] = [
      [this.summonRobinCombo, g.FIGHTER_ID_ROBIN],
      [this.summonRavenCombo, g.FIGHTER_ID_RAVEN],
      [this.summonStarfireCombo, g.FIGHTER_ID_STARFIRE],
      [this.summonBeastboyCombo, g.FIGHTER_ID_BEASTBOY],
    ];
    for (const [combo, id] of summons) {
      if (combo.checkKey(comboKey, delay)) {
        if (g.game.canSummon(this.target, id)) {
          if (!this.target.isDoingMove()) {
            if (this.target.opponent.isOnScreen()) {
              this.queuedCombo = g.MOVE_SUMMON_FIGHTER;
              this.queuedComboArg = id;
            }
          }
        }
      }
    }
  }

  update(): void {
    if (!this.enabled) return;
    this.updateKeys();
    const t = this.target;
    if (!voidp(this.queuedCombo)) {
      t.queueMove(this.queuedCombo, this.queuedComboArg);
      this.queuedCombo = undefined;
    } else if (t.isDoingMove()) {
      if (t.currMove === g.MOVE_JUMP) {
        if (this.hasState(this.KEYSTATE_PUNCH) && t.getPosY() < -150) {
          t.queueMove(g.MOVE_CYBORG_FLYING_PUNCH, 0);
        } else if (this.hasState(this.KEYSTATE_MOVE_RIGHT)) {
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
      t.queueMove(g.MOVE_STAND);
    } else if (this.hasState(this.KEYSTATE_MOVE_RIGHT)) {
      if (t.getDir() < 0) t.queueMove(g.MOVE_WALK_BACKWARD);
      else t.queueMove(g.MOVE_WALK_FORWARD);
    } else if (this.hasState(this.KEYSTATE_MOVE_LEFT)) {
      if (t.getDir() < 0) t.queueMove(g.MOVE_WALK_FORWARD);
      else t.queueMove(g.MOVE_WALK_BACKWARD);
    } else {
      t.queueMove(g.MOVE_STAND, 0);
    }
  }
}
