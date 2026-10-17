// Keyboard and mouse state, using the Macintosh virtual key codes the game's Lingo expects.

// Mac key code -> KeyboardEvent.code
const MAC_TO_CODE: Record<number, string> = {
  0: 'KeyA', 1: 'KeyS', 2: 'KeyD', 3: 'KeyF', 4: 'KeyH', 5: 'KeyG', 6: 'KeyZ', 7: 'KeyX', 8: 'KeyC', 9: 'KeyV',
  11: 'KeyB', 12: 'KeyQ', 13: 'KeyW', 14: 'KeyE', 15: 'KeyR', 16: 'KeyY', 17: 'KeyT', 18: 'Digit1', 19: 'Digit2',
  20: 'Digit3', 21: 'Digit4', 22: 'Digit6', 23: 'Digit5', 24: 'Equal', 25: 'Digit9', 26: 'Digit7', 27: 'Minus',
  28: 'Digit8', 29: 'Digit0', 30: 'BracketRight', 31: 'KeyO', 32: 'KeyU', 33: 'BracketLeft', 34: 'KeyI', 35: 'KeyP',
  36: 'Enter', 37: 'KeyL', 38: 'KeyJ', 39: 'Quote', 40: 'KeyK', 41: 'Semicolon', 42: 'Backslash', 43: 'Comma',
  44: 'Slash', 45: 'KeyN', 46: 'KeyM', 47: 'Period', 48: 'Tab', 49: 'Space', 53: 'Escape',
  123: 'ArrowLeft', 124: 'ArrowRight', 125: 'ArrowDown', 126: 'ArrowUp',
};

const down = new Set<string>(); // live browser keyboard state

// The original game polls keyPressed() thousands of times per frame inside Class_Main's busy-wait, so
// every key transition is seen at (close to) its real time, and taps shorter than a frame still register.
// The port reproduces that: browser key events are queued with real timestamps, mapped into the frame's
// slice of game time, and replayed in order through the polling loop (see busywait.ts).
export type KeyTransition = { t: number; code: string; down: boolean }; // t: game-clock ms
const realQueue: { t: number; code: string; down: boolean }[] = [];
const simDown = new Set<string>(); // the state keyPressed() reports while polling

export function drainKeyTransitions(prevReal: number, nowReal: number, prevGame: number, nowGame: number): KeyTransition[] {
  const span = Math.max(1, nowReal - prevReal);
  const out: KeyTransition[] = [];
  while (realQueue.length) {
    const e = realQueue.shift()!;
    const frac = Math.min(1, Math.max(0, (e.t - prevReal) / span));
    out.push({ t: prevGame + frac * (nowGame - prevGame), code: e.code, down: e.down });
  }
  return out;
}

export function applyKeyTransition(e: KeyTransition): void {
  if (e.down) simDown.add(e.code);
  else simDown.delete(e.code);
}

// Recording/replay hook: when set, keyPressed reads from this instead of the keyboard.
let override: ((macCode: number) => boolean) | null = null;
export function setKeyOverride(fn: ((macCode: number) => boolean) | null): void {
  override = fn;
}

export function keyPressed(macCode: number): boolean {
  if (override) return override(macCode);
  const code = MAC_TO_CODE[macCode];
  return code ? simDown.has(code) : false;
}

export function liveKeyDown(code: string): boolean {
  return down.has(code);
}

export const mouse = { x: -1, y: -1, down: false };

type MouseHandler = (type: 'down' | 'up' | 'move', x: number, y: number) => void;
let mouseHandler: MouseHandler | null = null;
export function setMouseHandler(fn: MouseHandler): void {
  mouseHandler = fn;
}

// Oracle test mode (?test=1): scripted mouse events in stage pixels, delivered exactly as the canvas
// listeners below deliver real ones (mouse state + the score player's queue).
export function injectMouse(type: 'down' | 'up' | 'move', x: number, y: number): void {
  if (type === 'up' && !mouse.down) return;
  mouse.x = x;
  mouse.y = y;
  if (type === 'down') mouse.down = true;
  if (type === 'up') mouse.down = false;
  mouseHandler?.(type, x, y);
}

let firstGesture: (() => void) | null = null;
export function onFirstGesture(fn: () => void): void {
  firstGesture = fn;
}
function gesture(): void {
  if (firstGesture) {
    const f = firstGesture;
    firstGesture = null;
    f();
  }
}

export function installInput(canvas: HTMLCanvasElement, stageWidth: number, stageHeight: number): void {
  const game = new Set(Object.values(MAC_TO_CODE));
  window.addEventListener('pointerdown', () => gesture());
  window.addEventListener('keydown', (e) => {
    gesture();
    if (!down.has(e.code)) realQueue.push({ t: performance.now(), code: e.code, down: true });
    down.add(e.code);
    if (game.has(e.code) && !e.metaKey && !e.ctrlKey) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (down.has(e.code)) realQueue.push({ t: performance.now(), code: e.code, down: false });
    down.delete(e.code);
  });
  window.addEventListener('blur', () => {
    const t = performance.now();
    for (const code of down) realQueue.push({ t, code, down: false });
    down.clear();
  });
  const toStage = (e: MouseEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * stageWidth, ((e.clientY - r.top) / r.height) * stageHeight];
  };
  canvas.addEventListener('mousemove', (e) => {
    const [x, y] = toStage(e);
    mouse.x = x;
    mouse.y = y;
    mouseHandler?.('move', x, y);
  });
  canvas.addEventListener('mouseleave', () => {
    mouse.x = -1;
    mouse.y = -1;
    mouseHandler?.('move', -1, -1);
  });
  canvas.addEventListener('mousedown', (e) => {
    gesture();
    const [x, y] = toStage(e);
    mouse.down = true;
    mouseHandler?.('down', x, y);
  });
  window.addEventListener('mouseup', (e) => {
    if (!mouse.down) return;
    const [x, y] = toStage(e);
    mouse.down = false;
    mouseHandler?.('up', x, y);
  });
}

// cursor(n): 280 is Director's pointing-finger cursor, -1 / 0 the default arrow.
let cursorTarget: HTMLElement | null = null;
export function setCursorTarget(el: HTMLElement): void {
  cursorTarget = el;
}
export function cursor(n: number): void {
  if (cursorTarget) cursorTarget.style.cursor = n === 280 ? 'pointer' : n === 4 ? 'wait' : n === 200 ? 'none' : 'default';
}
