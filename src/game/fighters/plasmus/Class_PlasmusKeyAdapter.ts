import { g, list, voidp } from '../../../runtime';
import { Class_KeyAdapter } from '../Class_KeyAdapter';
import type { Class_KeyCombo } from '../Class_KeyCombo';
import type { KeyEvent } from '../../core/Class_KeyManager';

export class Class_PlasmusKeyAdapter extends Class_KeyAdapter {
  armSwipeCombo: Class_KeyCombo;
  chestBlastCombo: Class_KeyCombo;
  crabThrowCombo: Class_KeyCombo;
  sludgeThrowCombo: Class_KeyCombo;
  queuedCombo: any;

  constructor(obj: any) {
    super(obj);
    const C = g.classes.Class_KeyCombo;
    this.armSwipeCombo = new C(list(this.KEYCOMBO_DOWN, this.KEYCOMBO_FORWARD, this.KEYCOMBO_PUNCH));
    this.chestBlastCombo = new C(list(this.KEYCOMBO_FORWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_KICK));
    this.crabThrowCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_BACKWARD, this.KEYCOMBO_BACKWARD, this.KEYCOMBO_PUNCH));
    this.sludgeThrowCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_DOWN, this.KEYCOMBO_FORWARD, this.KEYCOMBO_PUNCH));
    this.queuedCombo = undefined;
  }

  destroy(): undefined {
    super.destroy();
    this.armSwipeCombo.destroy();
    this.chestBlastCombo.destroy();
    this.crabThrowCombo.destroy();
    this.sludgeThrowCombo.destroy();
    return undefined;
  }

  reset(): void {
    super.reset();
    this.armSwipeCombo.reset();
    this.chestBlastCombo.reset();
    this.crabThrowCombo.reset();
    this.sludgeThrowCombo.reset();
  }

  checkCombo(event: KeyEvent, comboKey: number): void {
    const delay = event.timestamp - this.prevTimestamp;
    if (this.armSwipeCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_PLASMUS_ARM_SWIPE;
    }
    if (this.chestBlastCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_PLASMUS_CHEST_BLAST;
    }
    if (this.crabThrowCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_PLASMUS_CRAB_THROW;
    }
    if (this.sludgeThrowCombo.checkKey(comboKey, delay)) {
      if (!this.target.isDoingMove()) this.queuedCombo = g.MOVE_PLASMUS_SLUDGE_THROW;
    }
  }

  // Unlike the other key adapters, this one has no `enabled` check (as in the Lingo).
  update(): void {
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
      // nothing
    } else if (this.hasState(this.KEYSTATE_MOVE_UP)) {
      // nothing
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
