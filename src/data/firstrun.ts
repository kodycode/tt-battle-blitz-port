// First-run screen: the repository and site ship no game data, so the player supplies the original release
// (ttbattleblitz.zip from the Internet Archive). The zip is verified (SHA-1), extracted in a Web Worker,
// stored in IndexedDB (cache.ts) and handed to the game.
import type { ExtractedGame } from './types';
import type { WorkerReply, WorkerRequest } from './extract.worker';
import { clearStoredData, hasStoredData } from './cache';

export const ARCHIVE_PAGE = 'https://archive.org/details/ttbattleblitz';
export const ARCHIVE_ZIP = 'https://archive.org/download/ttbattleblitz/ttbattleblitz.zip';
export const ZIP_NAME = 'ttbattleblitz.zip';
export const ZIP_SHA1 = 'b41c01eeedcef3c707decef5a52ffeff7de93dd5';

const CSS = `
#firstrun { box-sizing: border-box; width: min(100vw, 150vh); aspect-ratio: 3 / 2; max-width: 100vw; max-height: 100vh;
  container-type: inline-size; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at 50% 0%, #2a2f6b 0%, #12142e 70%); color: #f2f2f7;
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
#firstrun .panel { width: 86%; display: flex; flex-direction: column; gap: 2.2cqw; font-size: clamp(11px, 2.5cqw, 16px); }
#firstrun h1 { margin: 0; font-size: 1.6em; letter-spacing: .02em; color: #ffd23f; }
#firstrun p { margin: 0; color: #c9cbe0; }
#firstrun a { color: #8fd3ff; }
#firstrun ol { margin: 0; padding-left: 1.3em; display: flex; flex-direction: column; gap: .5em; }
#firstrun .drop { border: 2px dashed #5a60a8; border-radius: 10px; padding: 1.1em; text-align: center; cursor: pointer;
  background: rgba(255,255,255,.03); transition: border-color .15s, background .15s; }
#firstrun .drop:hover, #firstrun .drop.over { border-color: #ffd23f; background: rgba(255,210,63,.08); }
#firstrun .drop strong { color: #fff; }
#firstrun .drop.busy { cursor: default; border-style: solid; border-color: #5a60a8; background: rgba(255,255,255,.03); }
#firstrun .bar { height: .6em; border-radius: .3em; background: #2b2f5e; overflow: hidden; margin-top: .7em; display: none; }
#firstrun .bar > div { height: 100%; width: 0; background: #ffd23f; transition: width .1s; }
#firstrun .busy .bar { display: block; }
#firstrun .status { min-height: 1.45em; font-size: .9em; color: #c9cbe0; margin-top: .3em; }
#firstrun .error { color: #ff8a8a; font-size: .9em; min-height: 1.45em; }
#firstrun .foot { display: flex; justify-content: space-between; gap: 1em; font-size: .78em; color: #8a8db0; }
#firstrun .foot button { background: none; border: 0; padding: 0; color: #8fd3ff; text-decoration: underline; cursor: pointer; font: inherit; }
`;

function sha1Hex(buf: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest('SHA-1', buf).then((d) => [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''));
}

// Verifies the zip and extracts it in a worker. Throws Error with a user-facing message.
export async function extractZip(
  zip: ArrayBuffer,
  onProgress: (fraction: number, stage: string) => void,
  store = true,
): Promise<{ game: ExtractedGame; storeError: string | null }> {
  if (!globalThis.crypto?.subtle) throw new Error('This page needs a secure context (https or localhost) to check the file.');
  const sha1 = await sha1Hex(zip);
  if (sha1 !== ZIP_SHA1)
    throw new Error(`This is not the expected ${ZIP_NAME} (SHA-1 ${sha1.slice(0, 12)}…, expected ${ZIP_SHA1.slice(0, 12)}…). Download it from the Internet Archive link above.`);
  const worker = new Worker(new URL('./extract.worker.ts', import.meta.url), { type: 'module' });
  try {
    return await new Promise((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<WorkerReply>) => {
        const m = e.data;
        if (m.type === 'progress') onProgress(m.total > 0 ? m.done / m.total : 0, m.stage);
        else if (m.type === 'done') resolve({ game: m.game, storeError: m.storeError });
        else reject(new Error(`Extracting the game failed: ${m.message}`));
      };
      worker.onerror = (e) => reject(new Error(`Extracting the game failed: ${e.message || 'worker error'}`));
      const msg: WorkerRequest = { zip: new Uint8Array(zip), sha1, store };
      worker.postMessage(msg, [zip]);
    });
  } finally {
    worker.terminate();
  }
}

// Shows the first-run screen until a valid zip has been extracted; resolves with the game.
export function firstRun(note?: string): Promise<ExtractedGame> {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'firstrun';
  root.innerHTML = `
    <div class="panel">
      <h1>Teen Titans: Battle Blitz</h1>
      <p>A browser port of Cartoon Network's 2003 Shockwave game. The game itself is not included here:
        you need your own copy of the original release.</p>
      <ol>
        <li>Download <a href="${ARCHIVE_ZIP}" target="_blank" rel="noopener"><code>${ZIP_NAME}</code></a>
          (12 MB) from the <a href="${ARCHIVE_PAGE}" target="_blank" rel="noopener">Internet Archive</a>.</li>
        <li>Drop it below, or click to choose it.</li>
      </ol>
      <div class="drop" tabindex="0" role="button">
        <div class="label"><strong>Drop ${ZIP_NAME} here</strong> or click to choose the file</div>
        <div class="bar"><div></div></div>
        <div class="status"></div>
      </div>
      <div class="error" role="alert"></div>
      <p style="font-size:.85em">The file is unpacked in your browser and kept in its local storage for next time;
        nothing is uploaded.</p>
      <div class="foot">
        <span>Teen Titans and the game belong to Warner Bros. Discovery / Cartoon Network / DC.</span>
        <button type="button" class="remove" hidden>Remove stored game data</button>
      </div>
    </div>
    <input type="file" accept=".zip,application/zip" hidden>`;
  const canvas = document.getElementById('stage') as HTMLElement | null;
  const loading = document.getElementById('loading') as HTMLElement | null;
  if (canvas) canvas.style.display = 'none';
  if (loading) loading.style.display = 'none';
  document.body.appendChild(root);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const drop = $<HTMLDivElement>('.drop');
  const label = $<HTMLDivElement>('.label');
  const bar = $<HTMLDivElement>('.bar > div');
  const status = $<HTMLDivElement>('.status');
  const error = $<HTMLDivElement>('.error');
  const input = $<HTMLInputElement>('input[type=file]');
  const remove = $<HTMLButtonElement>('.remove');
  if (note) error.textContent = note;

  void hasStoredData().then((has) => (remove.hidden = !has));
  remove.onclick = async () => {
    await clearStoredData();
    remove.hidden = true;
    status.textContent = 'Stored game data removed.';
  };

  let detach = () => {};
  return new Promise((resolve) => {
    let busy = false;
    const handle = async (file: File | undefined) => {
      if (!file || busy) return;
      busy = true;
      error.textContent = '';
      drop.classList.add('busy');
      label.textContent = file.name;
      const setProgress = (f: number, stage: string) => {
        bar.style.width = `${Math.round(Math.max(0, Math.min(1, f)) * 100)}%`;
        status.textContent = `${stage}… ${Math.floor(f * 100)}%`;
      };
      try {
        setProgress(0, 'Checking');
        const { game, storeError } = await extractZip(await file.arrayBuffer(), setProgress);
        if (storeError) console.warn('game data could not be stored; the zip will be needed again next time:', storeError);
        // Ask the browser not to evict the stored data under storage pressure (best effort).
        else void navigator.storage?.persist?.().catch(() => false);
        detach();
        root.remove();
        style.remove();
        if (canvas) canvas.style.display = '';
        if (loading) loading.style.display = '';
        resolve(game);
      } catch (err) {
        error.textContent = (err as Error).message || String(err);
        label.innerHTML = `<strong>Drop ${ZIP_NAME} here</strong> or click to choose the file`;
        status.textContent = '';
        bar.style.width = '0';
        drop.classList.remove('busy');
        busy = false;
      }
    };
    drop.onclick = () => !busy && input.click();
    drop.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && !busy && input.click();
    input.onchange = () => {
      void handle(input.files?.[0]);
      input.value = '';
    };
    // Drops anywhere on the page count (a drop outside would otherwise make the browser open the zip).
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!busy) drop.classList.add('over');
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) drop.classList.remove('over');
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      drop.classList.remove('over');
      void handle(e.dataTransfer?.files?.[0]);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    detach = () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  });
}
