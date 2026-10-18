import { g, list, point, voidp } from '../../../runtime';
import { Class_KeyAdapter } from '../Class_KeyAdapter';
import type { Class_KeyCombo } from '../Class_KeyCombo';
import type { KeyEvent } from '../../core/Class_KeyManager';

export class Class_BeastboyKeyAdapter extends Class_KeyAdapter {
  pterodactylSwoopCombo: Class_KeyCombo;
  gorillaSmashCombo: Class_KeyCombo;
  rhinoChargeCombo: Class_KeyCombo;
  queuedCombo: any;
  queuedComboArg: any;

  constructor(obj: any) {
    super(obj);
    const C = g.classes.Class_KeyCombo;
    this.pterodactylSwoopCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_KICK));
    this.gorillaSmashCombo = new C(list(this.KEYCOMBO_DOWN, this.KEYCOMBO_DOWN, this.KEYCOMBO_PUNCH));
    this.rhinoChargeCombo = new C(list(this.KEYCOMBO_DOWN, this.KEYCOMBO_FORWARD, this.KEYCOMBO_KICK));
    this.queuedCombo = undefined;
  }

  destroy(): undefined {
    super.destroy();
    this.pterodactylSwoopCombo.destroy();
    this.gorillaSmashCombo.destroy();
    this.rhinoChargeCombo.destroy();
    return undefined;
  }

  reset(): void {
    super.reset();
    this.pterodactylSwoopCombo.reset();
    this.gorillaSmashCombo.reset();
    this.rhinoChargeCombo.reset();
  }

  checkCombo(event: KeyEvent, comboKey: number): void {
    const delay = event.timestamp - this.prevTimestamp;
    if (this.pterodactylSwoopCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_BEASTBOY_PTERODACTYL_SWOOP;
    }
    if (this.gorillaSmashCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_BEASTBOY_GORILLA_SMASH;
    }
    if (this.rhinoChargeCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_BEASTBOY_RHINO_CHARGE;
    }
    const summons: [Class_KeyCombo, number][] = [
      [this.summonRobinCombo, g.FIGHTER_ID_ROBIN],
      [this.summonRavenCombo, g.FIGHTER_ID_RAVEN],
      [this.summonCyborgCombo, g.FIGHTER_ID_CYBORG],
      [this.summonStarfireCombo, g.FIGHTER_ID_STARFIRE],
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
        if (this.hasState(this.KEYSTATE_KICK) && t.getPosY() < -200) {
          t.queueMove(g.MOVE_BEASTBOY_EAGLE_STRIKE, 0);
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
