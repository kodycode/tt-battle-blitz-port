// Picks the game data source, then boots the game with it:
//   1. static files under public/data (development, verification tests), unless ?nostatic=1;
//   2. the extracted game cached in IndexedDB (cache.ts);
//   3. the first-run screen (firstrun.ts): the player supplies ttbattleblitz.zip.
// Query flags: ?reset=1 removes the stored game data first; ?nostatic=1 ignores public/data;
// ?mem=1 (testing) reads the static files into memory and runs the in-memory (extracted-data) path on them.
import { GameSource, MemorySource, StaticSource } from './source';
import { clearStoredData, loadGame } from './cache';
import { firstRun } from './firstrun';
import { loadStaticAsExtracted } from './static_game';

export async function startup(boot: (source: GameSource) => Promise<void>): Promise<void> {
  const q = new URLSearchParams(location.search);
  const loading = document.getElementById('loading');
  const say = (t: string) => loading && (loading.textContent = t);
  if (q.get('reset') === '1') {
    await clearStoredData();
    q.delete('reset');
    const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
  }

  let source: GameSource | null = null;
  let fromCache = false;
  let note: string | undefined;
  if (q.get('mem') === '1') {
    source = new MemorySource(await loadStaticAsExtracted('', (d, t) => say(`Reading… ${Math.floor((100 * d) / t)}%`)));
  }
  if (!source && q.get('nostatic') !== '1') source = await StaticSource.probe();
  if (!source) {
    try {
      say('Loading game data…');
      const game = await loadGame();
      if (game) {
        source = new MemorySource(game);
        fromCache = true;
      }
    } catch (err) {
      console.warn('stored game data could not be read:', err);
      note = 'The stored game data could not be read; please choose the zip again.';
    }
  }
  if (!source) source = new MemorySource(await firstRun(note));
  say('Loading…');
  if (fromCache && q.get('test') !== '1') addRemoveDataLink();
  await boot(source);
}

// Small "remove game data" link while the game waits for its start click (only when booted from IndexedDB).
function addRemoveDataLink(): void {
  const a = document.createElement('button');
  a.type = 'button';
  a.textContent = 'Remove stored game data';
  a.title = 'Delete the game data this browser stored from ttbattleblitz.zip';
  a.style.cssText =
    'position:fixed;right:10px;bottom:8px;background:none;border:0;padding:0;color:#8a8db0;font:12px system-ui,sans-serif;text-decoration:underline;cursor:pointer;z-index:2';
  // Keep this click from also starting the game (the start gesture listens on window).
  a.addEventListener('pointerdown', (e) => e.stopPropagation());
  a.addEventListener('click', async () => {
    if (!confirm('Remove the stored game data? You will need ttbattleblitz.zip again next time.')) return;
    await clearStoredData();
    location.reload();
  });
  document.body.appendChild(a);
  const removeLink = () => {
    a.remove();
    window.removeEventListener('pointerdown', removeLink);
    window.removeEventListener('keydown', removeLink);
  };
  window.addEventListener('pointerdown', removeLink);
  window.addEventListener('keydown', removeLink);
}
