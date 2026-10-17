// First-run worker: extracts the game from the user's zip, stores it in IndexedDB, and hands the result to the
// page (bitmaps as views into one transferred buffer).
import { extractGame } from './extractor';
import { packImages, saveGame } from './cache';

export type WorkerRequest = { zip: Uint8Array; sha1: string; store: boolean };
export type WorkerReply =
  | { type: 'progress'; done: number; total: number; stage: string }
  | { type: 'done'; game: import('./types').ExtractedGame; storeError: string | null }
  | { type: 'error'; message: string };

const post = (m: WorkerReply, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { zip, sha1, store } = e.data;
  try {
    const game = await extractGame(zip, (done, total, stage) => post({ type: 'progress', done, total, stage }));
    const packed = packImages(game);
    let storeError: string | null = null;
    if (store) {
      post({ type: 'progress', done: 0, total: 1, stage: 'Saving' });
      try {
        await saveGame(packed, sha1);
      } catch (err) {
        // Quota or private mode: the game still runs, the zip is just needed again next time.
        storeError = String((err as Error)?.message ?? err);
      }
      post({ type: 'progress', done: 1, total: 1, stage: 'Saving' });
    }
    const buffers = new Set<ArrayBuffer>([packed.pixels.buffer as ArrayBuffer]);
    for (const m of [packed.game.sounds, packed.game.jpegs ?? new Map<string, Uint8Array>()])
      for (const b of m.values()) if (b.buffer !== zip.buffer) buffers.add(b.buffer as ArrayBuffer);
    post({ type: 'done', game: packed.game, storeError }, [...buffers]);
  } catch (err) {
    post({ type: 'error', message: String((err as Error)?.message ?? err) });
  }
};
