/// <reference types="vitest" />
import { defineConfig } from 'vite';

// Folders the dev server must never watch or scan: local data (original release, captures, tools) and the
// verification/research trees, which are not part of the page.
const notPage = ['**/local/**', '**/verification/**', '**/research/**', '**/docs/**', '**/dist/**'];

export default defineConfig(({ command }) => ({
  // public/ holds only game data extracted from the user's own copy (data/, assets/). The dev server serves
  // it; a production build must never ship it, so players supply the zip through the first-run screen.
  publicDir: command === 'build' ? false : 'public',
  worker: { format: 'es' },
  server: { watch: { ignored: notPage } },
  // Dependency discovery starts from the page only (not every .html file under the project root).
  optimizeDeps: { entries: ['index.html'] },
  test: { include: ['tests/**/*.test.ts'] },
}));
