// Display scaling. The game always renders at its native stage size (600x400); this only changes how the
// canvas is shown. Two modes, switchable with the button in the bottom-right corner (the choice is remembered):
//
//   crisp             the largest integer multiple of the native size that fits the window, drawn with
//                     nearest-neighbour pixels; computed in device pixels so each game pixel is exactly N×N
//                     screen pixels on high-DPI displays
//   smooth (default)  fills the window (keeping the aspect ratio) with the browser's smoothing
//
//   ?scale=N          fixed integer scale N (crisp), overrides the mode

type Mode = 'crisp' | 'smooth';

const MAX_SCALE = 16;
const STORAGE_KEY = 'tt-display-mode';

function requestedScale(): number | null {
  const v = Number(new URLSearchParams(location.search).get('scale'));
  return Number.isInteger(v) && v >= 1 ? Math.min(v, MAX_SCALE) : null;
}

function loadMode(): Mode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'crisp' ? 'crisp' : 'smooth';
  } catch {
    return 'smooth';
  }
}

function saveMode(mode: Mode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // storage unavailable (private window etc.): the choice just isn't remembered
  }
}

export function installIntegerScaling(canvas: HTMLCanvasElement, width: number, height: number): void {
  const fixed = requestedScale();
  let mode: Mode = fixed !== null ? 'crisp' : loadMode();
  canvas.style.maxWidth = 'none';
  canvas.style.maxHeight = 'none';

  const apply = () => {
    canvas.style.imageRendering = mode === 'crisp' ? 'pixelated' : 'auto';
    if (mode === 'smooth') {
      const s = Math.min(window.innerWidth / width, window.innerHeight / height);
      canvas.style.width = `${width * s}px`;
      canvas.style.height = `${height * s}px`;
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.floor(Math.min((window.innerWidth * dpr) / width, (window.innerHeight * dpr) / height));
    if (fixed === null && fit < 1) {
      // Window smaller than the native stage: shrink to fit (the only non-integer case).
      const s = Math.min(window.innerWidth / width, window.innerHeight / height);
      canvas.style.width = `${width * s}px`;
      canvas.style.height = `${height * s}px`;
      return;
    }
    const k = fixed ?? Math.min(fit, MAX_SCALE);
    canvas.style.width = `${(width * k) / dpr}px`;
    canvas.style.height = `${(height * k) / dpr}px`;
  };

  apply();
  window.addEventListener('resize', apply);
  // Re-apply when the device pixel ratio changes (browser zoom, moving the window to another display).
  const watchDpr = () => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener('change', () => {
      apply();
      watchDpr();
    }, { once: true });
  };
  watchDpr();

  if (fixed === null) addToggle(() => mode, (m) => {
    mode = m;
    saveMode(m);
    apply();
  });
}

// Small corner button: "Crisp pixels: on/off".
function addToggle(get: () => Mode, set: (m: Mode) => void): void {
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
    const on = get() === 'crisp';
    btn.textContent = `Crisp pixels: ${on ? 'On' : 'Off'}`;
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on
      ? 'Whole-number scaling with sharp pixels. Click to fill the window with smoothing instead.'
      : 'Fills the window with smoothing. Click for whole-number scaling with sharp pixels.';
  };
  btn.addEventListener('mouseenter', () => (btn.style.opacity = '1'));
  btn.addEventListener('mouseleave', () => (btn.style.opacity = '0.55'));
  // Keep clicks and focus away from the game (the game reads keys globally; don't leave the button focused).
  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    set(get() === 'crisp' ? 'smooth' : 'crisp');
    label();
  });
  label();
  document.body.appendChild(btn);
}
