// Release zip access (fflate, MIT). Only the files the extractor needs are inflated.
import { unzipSync } from 'fflate';

/** Returns the zip entries whose base name passes `want`, keyed by base name (directories stripped). */
export function readZipEntries(zip: Uint8Array, want: (baseName: string) => boolean): Map<string, Uint8Array> {
  const files = unzipSync(zip, {
    filter: (f) => {
      const base = f.name.split('/').pop() ?? '';
      return base !== '' && want(base);
    },
  });
  const out = new Map<string, Uint8Array>();
  for (const [name, data] of Object.entries(files)) out.set(name.split('/').pop()!, data);
  return out;
}
