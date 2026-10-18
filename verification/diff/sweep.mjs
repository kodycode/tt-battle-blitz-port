// Regression sweep: plays every scenario (or the ones named) through the port and compares each with the original
// projector capture: pixels at tolerance 0 (diff.mjs), and the random state and score frame on every tick
// (frames.json). Needs the projector captures in local/captures/<name>/projector (or projector_v2, a re-capture),
// see docs/VERIFICATION.md.
// Usage: node verification/diff/sweep.mjs [--parallel N] [--out <capture name>] [scenario ...]
//   --parallel N  scenarios run at once (default 4; each is a headless browser)
//   --out NAME    port capture folder under local/captures/<scenario>/ (default port_sweep); its diff goes to
//                 NAME_diff and the summary to local/captures/_sweep_NAME.txt
// Exit code 1 when any scenario differs.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const parallel = Math.max(1, Number(opt('--parallel', 4)) || 4);
const outName = opt('--out', 'port_sweep');
const names = args.length
  ? args
  : fs.readdirSync(path.join(root, 'verification', 'scenarios')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));

const run = (argv) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, argv, { cwd: root });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
  });

const results = {};
let failed = 0;
const one = async (name) => {
  const cap = path.join(root, 'local', 'captures', name);
  // A re-capture of the original (projector_v2), where one was made, else the first capture.
  const ref = ['projector_v2', 'projector'].map((d) => path.join(cap, d)).find((d) => fs.existsSync(path.join(d, 'frames.json'))) ?? path.join(cap, 'projector');
  const outDir = path.join(cap, outName);
  if (!fs.existsSync(path.join(ref, 'frames.json'))) {
    failed++;
    return (results[name] = `no projector capture in ${path.relative(root, ref)}`);
  }
  const t0 = Date.now();
  const r = await run([path.join(root, 'scripts', 'run_port.mjs'), path.join(root, 'verification', 'scenarios', `${name}.json`), '--out', outDir, '--rgba']);
  if (r.code !== 0) {
    failed++;
    return (results[name] = `port run failed (exit ${r.code}): ${r.out.trim().split('\n').slice(-3).join(' | ')}`);
  }
  const d = await run([path.join(root, 'verification', 'diff', 'diff.mjs'), name, '--a-dir', ref, '--b-dir', outDir, '--out', path.join(cap, `${outName}_diff`), '--pix', '0', '--tick-pct', '0', '--offset', '0']);
  const ticks = (dir) => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, 'frames.json'), 'utf8'));
    return Array.isArray(j) ? j : (j.frames ?? j.ticks ?? []);
  };
  const A = ticks(ref), B = ticks(outDir);
  let rng = 0, frame = 0;
  for (let i = 0; i < Math.min(A.length, B.length); i++) {
    if (A[i].rngState !== undefined && A[i].rngState !== B[i].rngState) rng++;
    if (A[i].frame !== undefined && A[i].frame !== B[i].frame) frame++;
  }
  const m = d.out.match(/divergent (\d+), pixel-identical (\d+)/);
  const divergent = m ? Number(m[1]) : NaN;
  const ok = A.length === B.length && rng === 0 && frame === 0 && divergent === 0;
  if (!ok) failed++;
  results[name] = `${ok ? 'ok  ' : 'DIFF'} ticks ${B.length}/${A.length}, pixel-divergent ticks ${m ? divergent : '?'}, rngState diffs ${rng}, frame diffs ${frame} (${((Date.now() - t0) / 60000).toFixed(1)} min)`;
  console.log(`${name}: ${results[name]}`);
};
const queue = names.slice();
await Promise.all(Array.from({ length: parallel }, async () => {
  while (queue.length) await one(queue.shift());
}));
const report = names.map((n) => `${n}: ${results[n]}`).join('\n');
fs.writeFileSync(path.join(root, 'local', 'captures', `_sweep_${outName}.txt`), report + '\n');
console.log(`\n${report}\n\n${names.length - failed}/${names.length} scenarios identical to the original`);
process.exit(failed ? 1 : 0);
