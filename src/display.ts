// Display scaling. The game always renders at its native stage size (600x400); this only changes how the frame is
// shown. Two modes, switchable with the button in the bottom-right corner (the choice is remembered):
//
//   sharp (default)  the frame is enlarged by pixel replication to the smallest whole multiple of its size that
//                    covers the window in device pixels (main.ts copies it into the visible canvas), and the
//                    browser fits that to the window. Every game pixel stays a crisp block of the original colour;
//                    where the window is not a whole multiple, block edges are blended over at most one screen
//                    pixel. It fills the window, keeping the 3:2 shape, at any size up to 4K and beyond.
//   smooth           the native frame scaled up by the browser with smoothing
//
//   ?scale=N         exactly N x N screen pixels per game pixel, whatever the window (pixel-perfect; may not fill
//                    the window, or overflow it); no button
//
// The canvas's backing size follows the mode, the window and the device pixel ratio (browser zoom, moving the
// window to another display); onResize tells main.ts to repaint the whole picture.

export type DisplayMode = 'sharp' | 'smooth';

const MAX_SCALE = 16;
const STORAGE_KEY = 'tt-display-mode';

function requestedScale(): number | null {
  const v = Number(new URLSearchParams(location.search).get('scale'));
  return Number.isInteger(v) && v >= 1 ? Math.min(v, MAX_SCALE) : null;
}

function loadMode(): DisplayMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'smooth' ? 'smooth' : 'sharp';
  } catch {
    return 'sharp';
  }
}

function saveMode(mode: DisplayMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // storage unavailable (private window etc.): the choice just isn't remembered
  }
}

// Sizes `canvas` for showing a width x height frame. With fixedNative (test mode) the canvas keeps the native
// size and is only fitted to the window. Returns a function giving the current enlargement (canvas / native size).
export function installDisplay(canvas: HTMLCanvasElement, width: number, height: number, onResize: () => void, fixedNative = false): () => number {
  const fixed = fixedNative ? null : requestedScale();
  let mode: DisplayMode = fixedNative ? 'smooth' : fixed !== null ? 'sharp' : loadMode();
  let k = 0;
  canvas.style.maxWidth = 'none';
  canvas.style.maxHeight = 'none';

  const apply = () => {
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min(window.innerWidth / width, window.innerHeight / height);
    const next = fixedNative || mode === 'smooth' ? 1 : (fixed ?? Math.max(1, Math.min(MAX_SCALE, Math.ceil(fit * dpr - 0.01))));
    if (next !== k) {
      k = next;
      canvas.width = width * k;
      canvas.height = height * k;
      onResize();
    }
    // With ?scale=N, exactly N device pixels per game pixel; otherwise fit the window.
    const css = fixed !== null ? fixed / dpr : fit;
    canvas.style.width = `${width * css}px`;
    canvas.style.height = `${height * css}px`;
    // The enlargement itself is pixel replication (main.ts); the browser only fits the result to the window.
    canvas.style.imageRendering = fixed !== null ? 'pixelated' : 'auto';
  };

  apply();
  window.addEventListener('resize', apply);
  const watchDpr = () => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener('change', () => {
      apply();
      watchDpr();
    }, { once: true });
  };
  watchDpr();

  if (!fixedNative && fixed === null)
    addToggle(() => mode, (m) => {
      mode = m;
      saveMode(m);
      apply();
    });
  return () => k;
}

// Small corner button: "Sharp pixels: On/Off".
function addToggle(get: () => DisplayMode, set: (m: DisplayMode) => void): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'display-toggle';
  Object.assign(btn.style, {
    position: 'fixed',
    right: '10px',
    bottom: '10px',
    zIndex: '10',
    padding: '5px 10px',
    font: '12px system-ui, sans-serif',
    color: '#ddd',
    background: 'rgba(0, 0, 0, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '6px',
    cursor: 'pointer',
    opacity: '0.55',
    transition: 'opacity 0.15s',
  } as Partial<CSSStyleDeclaration>);
  const label = () => {
    const on = get() === 'sharp';
    btn.textContent = `Sharp pixels: ${on ? 'On' : 'Off'}`;
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on
      ? 'Every game pixel is a crisp block, filling the window. Click for smooth scaling instead.'
      : 'Smooth scaling. Click for crisp game pixels.';
  };
  btn.addEventListener('mouseenter', () => (btn.style.opacity = '1'));
  btn.addEventListener('mouseleave', () => (btn.style.opacity = '0.55'));
  // Keep clicks and focus away from the game (the game reads keys globally; don't leave the button focused).
  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    set(get() === 'sharp' ? 'smooth' : 'sharp');
    label();
  });
  label();
  document.body.appendChild(btn);
}
