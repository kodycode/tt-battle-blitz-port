import { g, list, voidp } from '../runtime';
import { Class_KeyAdapter } from './Class_KeyAdapter';
import type { Class_KeyCombo } from './Class_KeyCombo';
import type { KeyEvent } from './Class_KeyManager';

export class Class_CinderblockKeyAdapter extends Class_KeyAdapter {
  doublePunchCombo: Class_KeyCombo;
  stompCombo: Class_KeyCombo;
  backhandCombo: Class_KeyCombo;
  queuedCombo: any;

  constructor(obj: any) {
    super(obj);
    const C = g.classes.Class_KeyCombo;
    this.doublePunchCombo = new C(list(this.KEYCOMBO_FORWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_PUNCH));
    this.stompCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_DOWN, this.KEYCOMBO_DOWN, this.KEYCOMBO_KICK));
    this.backhandCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_BACKWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_PUNCH));
    this.queuedCombo = undefined;
  }

  destroy(): undefined {
    super.destroy();
    this.doublePunchCombo.destroy();
    this.stompCombo.destroy();
    this.backhandCombo.destroy();
    return undefined;
  }

  reset(): void {
    super.reset();
    this.doublePunchCombo.reset();
    this.stompCombo.reset();
    this.backhandCombo.reset();
  }

  checkCombo(event: KeyEvent, comboKey: number): void {
    const delay = event.timestamp - this.prevTimestamp;
    if (this.doublePunchCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_CINDERBLOCK_DOUBLE_PUNCH;
    }
    if (this.stompCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_CINDERBLOCK_STOMP;
    }
    if (this.backhandCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_CINDERBLOCK_BACKHAND;
    }
  }

  update(): void {
    // No `enabled` check here, unlike the Titan key adapters (as in the Lingo).
    this.updateKeys();
    const t = this.target;
    if (!voidp(this.queuedCombo)) {
      t.queueMove(this.queuedCombo);
      this.queuedCombo = undefined;
    } else if (t.isDoingMove()) {
      // nothing
    } else if (this.hasState(this.KEYSTATE_MOVE_DOWN)) {
      t.queueMove(g.MOVE_BLOCK, 0);
    } else if (this.hasState(this.KEYSTATE_PUNCH)) {
      t.queueMove(g.MOVE_PUNCH, 0);
      this.clearState(this.KEYSTATE_PUNCH);
    } else if (this.hasState(this.KEYSTATE_KICK)) {
      t.queueMove(g.MOVE_KICK, 0);
      this.clearState(this.KEYSTATE_KICK);
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
