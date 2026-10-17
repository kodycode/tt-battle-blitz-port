import { g, LList, list, keyPressed, theMilliseconds } from '../runtime';

export type KeyEvent = { keyCode: number; timestamp: number };

export class Class_KeyManager {
  listeners: LList<any>;
  monitorList: LList<number>;
  keyStates: LList<number>;

  constructor() {
    this.monitorList = list(g.KEYCODE_A, g.KEYCODE_S, g.KEYCODE_D, g.KEYCODE_F, g.KEYCODE_H, g.KEYCODE_G, g.KEYCODE_Z, g.KEYCODE_X, g.KEYCODE_C, g.KEYCODE_V, g.KEYCODE_B, g.KEYCODE_Q, g.KEYCODE_W, g.KEYCODE_E, g.KEYCODE_R, g.KEYCODE_Y, g.KEYCODE_T, g.KEYCODE_1, g.KEYCODE_2, g.KEYCODE_3, g.KEYCODE_4, g.KEYCODE_6, g.KEYCODE_5, g.KEYCODE_9, g.KEYCODE_7, g.KEYCODE_8, g.KEYCODE_ZERO, g.KEYCODE_O, g.KEYCODE_U, g.KEYCODE_I, g.KEYCODE_P, g.KEYCODE_L, g.KEYCODE_J, g.KEYCODE_K, g.KEYCODE_N, g.KEYCODE_M, g.KEYCODE_SPACEBAR, g.KEYCODE_ESC, g.KEYCODE_LEFT_ARROW, g.KEYCODE_RIGHT_ARROW, g.KEYCODE_DOWN_ARROW, g.KEYCODE_UP_ARROW);
    this.keyStates = g.util.newArray(256, 0);
    this.listeners = new LList();
  }

  destroy(): undefined {
    return undefined;
  }

  checkKey(code: number): void {
    if (keyPressed(code)) {
      if (!this.keyStates.get(code + 1)) {
        this.keyStates.set(code + 1, 1);
        this.sendKeyDownEvent(code);
      }
    } else if (this.keyStates.get(code + 1)) {
      this.keyStates.set(code + 1, 0);
      this.sendKeyUpEvent(code);
    }
  }

  sendKeyDownEvent(code: number): void {
    const event: KeyEvent = { keyCode: code, timestamp: theMilliseconds() };
    for (const o of this.listeners) o.keyDown(event);
  }

  sendKeyUpEvent(code: number): void {
    const event: KeyEvent = { keyCode: code, timestamp: theMilliseconds() };
    for (const o of this.listeners) o.keyUp(event);
  }

  update(): void {
    for (const code of this.monitorList) this.checkKey(code);
  }

  addListener(obj: any): void {
    if (this.listeners.getPos(obj)) return;
    this.listeners.append(obj);
  }

  removeListener(obj: any): void {
    const i = this.listeners.getPos(obj);
    if (i) this.listeners.deleteAt(i);
  }

  resetListeners(): void {
    this.listeners = new LList();
  }

  resetStates(): void {
    for (let i = 1; i <= this.keyStates.count; i++) this.keyStates.set(i, 0);
  }
}
