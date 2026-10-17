// The Lingo global `g` (an instance of Class_Globals). ES module live binding: importers see setGlobal() updates.
import type { Class_Globals } from '../game/Class_Globals';

export let g: Class_Globals = undefined as unknown as Class_Globals;

export function setGlobal(v: Class_Globals): void {
  g = v;
}
