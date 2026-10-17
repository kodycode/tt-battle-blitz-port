import { g, list, keyPressed, bitOr, bitAnd, bitNot, lingoMe } from '../runtime';
import type { Class_KeyCombo } from './Class_KeyCombo';
import type { KeyEvent } from './Class_KeyManager';

export class Class_KeyAdapter {
  KEYCODE_UP: number;
  KEYCODE_DOWN: number;
  KEYCODE_RIGHT: number;
  KEYCODE_LEFT: number;
  KEYCODE_PUNCH: number;
  KEYCODE_KICK: number;
  KEYSTATE_MOVE_UP: number;
  KEYSTATE_MOVE_DOWN: number;
  KEYSTATE_MOVE_RIGHT: number;
  KEYSTATE_MOVE_LEFT: number;
  KEYSTATE_PUNCH: number;
  KEYSTATE_KICK: number;
  KEYCOMBO_UP: number;
  KEYCOMBO_DOWN: number;
  KEYCOMBO_FORWARD: number;
  KEYCOMBO_BACKWARD: number;
  KEYCOMBO_PUNCH: number;
  KEYCOMBO_KICK: number;
  target: any;
  state: number;
  prevTimestamp: number;
  enabled: number;
  summonRobinCombo: Class_KeyCombo;
  summonRavenCombo: Class_KeyCombo;
  summonCyborgCombo: Class_KeyCombo;
  summonStarfireCombo: Class_KeyCombo;
  summonBeastboyCombo: Class_KeyCombo;

  constructor(obj: any) {
    this.KEYCODE_UP = g.KEYCODE_UP_ARROW;
    this.KEYCODE_DOWN = g.KEYCODE_DOWN_ARROW;
    this.KEYCODE_RIGHT = g.KEYCODE_RIGHT_ARROW;
    this.KEYCODE_LEFT = g.KEYCODE_LEFT_ARROW;
    this.KEYCODE_PUNCH = g.KEYCODE_Z;
    this.KEYCODE_KICK = g.KEYCODE_X;
    this.KEYSTATE_MOVE_UP = 1;
    this.KEYSTATE_MOVE_DOWN = 2;
    this.KEYSTATE_MOVE_RIGHT = 4;
    this.KEYSTATE_MOVE_LEFT = 8;
    this.KEYSTATE_PUNCH = 16;
    this.KEYSTATE_KICK = 32;
    this.KEYCOMBO_UP = 1;
    this.KEYCOMBO_DOWN = 2;
    this.KEYCOMBO_FORWARD = 4;
    this.KEYCOMBO_BACKWARD = 8;
    this.KEYCOMBO_PUNCH = 16;
    this.KEYCOMBO_KICK = 32;
    this.target = obj;
    this.state = 0;
    this.prevTimestamp = g.frameTimestamp;
    this.enabled = 1;
    const C = g.classes.Class_KeyCombo;
    this.summonRobinCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_DOWN, this.KEYCOMBO_FORWARD, this.KEYCOMBO_BACKWARD, this.KEYCOMBO_PUNCH));
    this.summonRavenCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_BACKWARD, this.KEYCOMBO_DOWN, this.KEYCOMBO_PUNCH));
    this.summonCyborgCombo = new C(list(this.KEYCOMBO_DOWN, this.KEYCOMBO_DOWN, this.KEYCOMBO_FORWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_PUNCH));
    this.summonStarfireCombo = new C(list(this.KEYCOMBO_FORWARD, this.KEYCOMBO_DOWN, this.KEYCOMBO_BACKWARD, this.KEYCOMBO_DOWN, this.KEYCOMBO_PUNCH));
    this.summonBeastboyCombo = new C(list(this.KEYCOMBO_BACKWARD, this.KEYCOMBO_FORWARD, this.KEYCOMBO_DOWN, this.KEYCOMBO_DOWN, this.KEYCOMBO_PUNCH));
  }

  destroy(): undefined {
    return undefined;
  }

  reset(): void {
    const me = lingoMe(this, Class_KeyAdapter, 'reset');
    this.state = 0;
    me.resetCombos();
    this.enabled = 1;
  }

  setState(attrib: number): void {
    this.state = bitOr(this.state, attrib);
  }
  clearState(attrib: number): void {
    this.state = bitAnd(this.state, bitNot(attrib));
  }
  resetState(_attrib?: number): void {
    this.state = 0;
  }
  hasState(attrib: number): boolean {
    return bitAnd(this.state, attrib) !== 0;
  }

  resetCombos(): void {
    this.summonRobinCombo.reset();
    this.summonRavenCombo.reset();
    this.summonCyborgCombo.reset();
    this.summonStarfireCombo.reset();
    this.summonBeastboyCombo.reset();
  }

  checkCombo(_event: KeyEvent, _comboKey: number): void {}

  updateKeys(): void {
    const me = lingoMe(this, Class_KeyAdapter, 'updateKeys');
    if (me.hasState(this.KEYSTATE_MOVE_UP) && !keyPressed(this.KEYCODE_UP)) me.clearState(this.KEYSTATE_MOVE_UP);
    if (me.hasState(this.KEYSTATE_MOVE_DOWN) && !keyPressed(this.KEYCODE_DOWN)) me.clearState(this.KEYSTATE_MOVE_DOWN);
    if (me.hasState(this.KEYSTATE_MOVE_RIGHT) && !keyPressed(this.KEYCODE_RIGHT)) me.clearState(this.KEYSTATE_MOVE_RIGHT);
    if (me.hasState(this.KEYSTATE_MOVE_LEFT) && !keyPressed(this.KEYCODE_LEFT)) me.clearState(this.KEYSTATE_MOVE_LEFT);
    if (me.hasState(this.KEYSTATE_PUNCH) && !keyPressed(this.KEYCODE_PUNCH)) me.clearState(this.KEYSTATE_PUNCH);
    if (me.hasState(this.KEYSTATE_KICK) && !keyPressed(this.KEYCODE_KICK)) me.clearState(this.KEYSTATE_KICK);
  }

  update(): void {}

  isEnabled(): number {
    return this.enabled;
  }

  setEnabled(b: any): void {
    const me = lingoMe(this, Class_KeyAdapter, 'setEnabled');
    this.enabled = b ? 1 : 0;
    if (this.enabled) me.resetCombos();
  }

  keyDown(event: KeyEvent): void {
    const me = lingoMe(this, Class_KeyAdapter, 'keyDown');
    switch (event.keyCode) {
      case this.KEYCODE_UP:
        me.setState(this.KEYSTATE_MOVE_UP);
        if (this.enabled) me.checkCombo(event, this.KEYCOMBO_UP);
        break;
      case this.KEYCODE_DOWN:
        me.setState(this.KEYSTATE_MOVE_DOWN);
        if (this.enabled) me.checkCombo(event, this.KEYCOMBO_DOWN);
        break;
      case this.KEYCODE_RIGHT:
        me.setState(this.KEYSTATE_MOVE_RIGHT);
        if (this.enabled) {
          if (this.target.getDir() > 0) me.checkCombo(event, this.KEYCOMBO_FORWARD);
          else me.checkCombo(event, this.KEYCOMBO_BACKWARD);
        }
        break;
      case this.KEYCODE_LEFT:
        me.setState(this.KEYSTATE_MOVE_LEFT);
        if (this.enabled) {
          if (this.target.getDir() > 0) me.checkCombo(event, this.KEYCOMBO_BACKWARD);
          else me.checkCombo(event, this.KEYCOMBO_FORWARD);
        }
        break;
      case this.KEYCODE_PUNCH:
        me.setState(this.KEYSTATE_PUNCH);
        if (this.enabled) me.checkCombo(event, this.KEYCOMBO_PUNCH);
        break;
      case this.KEYCODE_KICK:
        me.setState(this.KEYSTATE_KICK);
        if (this.enabled) me.checkCombo(event, this.KEYCOMBO_KICK);
        break;
    }
    this.prevTimestamp = event.timestamp;
  }

  keyUp(event: KeyEvent): void {
    const me = lingoMe(this, Class_KeyAdapter, 'keyUp');
    switch (event.keyCode) {
      case this.KEYCODE_UP:
        me.clearState(this.KEYSTATE_MOVE_UP);
        break;
      case this.KEYCODE_DOWN:
        me.clearState(this.KEYSTATE_MOVE_DOWN);
        break;
      case this.KEYCODE_RIGHT:
        me.clearState(this.KEYSTATE_MOVE_RIGHT);
        break;
      case this.KEYCODE_LEFT:
        me.clearState(this.KEYSTATE_MOVE_LEFT);
        break;
      case this.KEYCODE_PUNCH:
        me.clearState(this.KEYSTATE_PUNCH);
        break;
      case this.KEYCODE_KICK:
        me.clearState(this.KEYSTATE_KICK);
        break;
    }
  }
}
