// Frida agent for the verification harness: runs the original Projector.exe (Director MX 2004 10.1, 32-bit)
// deterministically and captures one 600x400 frame per game.dcr score frame ("tick").
// Loaded by run_projector.py into the suspended process and configured via rpc.exports.init() before
// resume. Design notes: docs/VERIFICATION.md. Addresses: docs/DIRECTOR_INTERNALS.md (Dirapi base 0x68000000,
// Iml32 base 0x69000000; always used as module.base + RVA).
//
// Threading rule (important for stability): OS functions that any thread may call (clock, Sleep, key and
// cursor state, CreateFile) are replaced by small C gates (CModule). Worker threads never enter JavaScript;
// only the main (Director) thread calls back into JS, and only where the harness logic needs it. Entering
// JS from arbitrary threads deadlocked (JS lock vs. loader/heap locks) in earlier versions.
'use strict';

// ---------------------------------------------------------------------------------------------
// Addresses (RVAs)
// ---------------------------------------------------------------------------------------------
// Dirapi player state-machine step `int PlayerStep(player*, int* out, int, int)` (stdcall). One call per
// state; player+0x58 = state about to run. A game.dcr frame cycle is observed as
//   S1 (enter frame + prepareFrame: Global_Main.prepareFrame -> Class_Main.update busy-wait, paint)
//   S2 S6 S10 S11 (FUN_68061A21: stage render + blit) S12 S14 S16 S17 S22 S27 (tempo wait) -> S1 ...
// S1 entry = tick start, first S27 entry of the tick = tick end (stage finished; capture here).
const RVA_PLAYER_STEP = 0x65528;
const OFF_PLAYER_STATE = 0x58;
const STATE_FRAME_BEGIN = 1;
const STATE_FRAME_END = 27;
const RVA_STAGE_RENDER = 0x61a21;     // FUN_68061A21(score, ?) stdcall: render + flush stage ("frame drawn")
const RVA_FOCUS_CHECK = 0x1d64c;      // FUN_6801D64C(ctx) stdcall: keyPressed focus gate (GetFocus()==stage)
const RVA_MOUSE_POS = 0x386ab;        // FUN_680386AB(win, POINT* out) stdcall: mouseLoc / rollover polling
const RVA_SET_RANDOM_SEED = 0x9979;   // void __stdcall SetRandomSeed(int)
const RVA_RNG_STATE = 0x152038;       // g_rng.state (= the randomSeed)
const RVA_MS_READ = 0x1edce;          // return address of the clock read inside `the milliSeconds` (0x6801ED97)
// Sprite channel state (docs/DIRECTOR_INTERNALS.md section 5): score `p` -> +0x28 frame-state handle H (D = *H),
// +0x2C channel struct count, +0x34 channel struct array (0x170 bytes per channel).
const RVA_FRAME_LOCK = 0x513dd;       // int __stdcall FrameLock(H, void **frameBuf, void **) -> channel count
const RVA_FRAME_UNLOCK = 0x51427;     // void __stdcall FrameUnlock(H, void **frameBuf, void **)
const CHAN_STRUCT_SIZE = 0x170;
const FRAME_REC_SIZE = 0x30;          // big-endian 48-byte score sprite record per channel
const FRAME_REC_BASE = 0x120;         // 6 main channels x 0x30 precede sprite channel 1
const IML_KEY_PRESSED_MAC = 0x6d140;  // Iml32 Ordinal_1770: int __stdcall KeyPressedMac(int macCode)
const IML_OFFSCREEN_TABLE = 0x8d590;  // Iml32 offscreen table, entries of 0x54 bytes, index = id - 1
const MAC_LAST_POLLED = 126;          // Class_KeyManager polls 42 Mac codes per busy-wait pass; Up (126) is last

// Virtual clock
// The clock seen by Director (timeGetTime = `the milliSeconds`) is GAME_EPOCH_MS + floor(n*1000/30) at the
// start of tick n; the port's test mode uses floor(n*1000/30) (same differences; the game only uses
// differences). GAME_EPOCH_MS is a multiple of 50 ms, so `the ticks` = rint(ms*0.06) also only differs by
// a constant (60000). Before tick 1 the clock starts at PRE_START_MS and creeps forward per read; it must
// stay below the epoch (Director compares some absolute times, e.g. the idle/rollover deadline at
// player+0x75A0, so the clock may never wrap or go back).
const PRE_START_MS = 100000;
const GAME_EPOCH_MS = 1000000;
const PRE_EPS_MS = 0.05;              // before tick 1: each main-thread clock read advances the clock this much
const HANG_READS = 20000;             // in a tick: clock reads beyond this many advance the clock ...
const HANG_EPS_MS = 0.0625;           // ... by this much each (hang breaker; never engaged in normal play)
const SITE_LOG_READS = 3000;          // in a tick: after this many reads, histogram read sites (diagnostics)
// Read sites with a private clock: throttles polled by loops that wait for I/O (not for time) while
// game.dcr's casts load in tick 1:
//   Dirapi FUN_680385F4 (read at +0x385FC): `if (now - last > 50) { last = now; pump(); }` (`last` @0x681520F8)
//   Dirapi FUN_68037DA6 (read at +0x37DB4): `if (now - obj[0x37C] <= obj[0x378]) return busy; else poll
//                                           obj->status()` (throttled "is the load finished?" check)
// With the frozen tick clock they never fire and the wait spins forever; with a flowing clock the real
// I/O wait leaks into the virtual clock. A private clock that jumps 100 s per read (past any interval)
// makes them fire on every call, and the shared clock is untouched.
const PRIVATE_CLOCK_SITES = [0x385fc, 0x37db4];

const WM_NULL = 0, WM_MOUSEMOVE = 0x200, WM_LBUTTONDOWN = 0x201, WM_LBUTTONUP = 0x202, MK_LBUTTON = 1;

// ---------------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------------
let cfg = null;
let mainTid = 0;
let dir = null, iml = null;
let vt = PRE_START_MS;                // virtual ms (float); value seen by the game = floor(vt) mod 2^32
let phase = 'pre';                    // 'pre' (wrapper/loading) | 'game' | 'done'
let tick = 0, inTick = false;
let gameOpened = false, seeded = false;
let sched = GAME_EPOCH_MS;            // tick n starts at sched + floor(n*1000/30); moves only on overrun
let readsInTick = 0, hangWarned = false, siteHist = null;
let privateSites = new Map();         // address string -> private clock value
let score = null;                     // Director score object (FUN_68061A21 arg0)
let rendersInTick = 0;
const log = (s) => send({ type: 'log', msg: s });
let diagFile = null;
function diag(s) {                    // synchronous diagnostics file (survives a sudden process death)
  try {
    if (!diagFile && cfg && cfg.diagFile) diagFile = new File(cfg.diagFile, 'a');
    if (diagFile) { diagFile.write(s + '\n'); diagFile.flush(); }
  } catch (e) {}
}

// scripted input
const keyState = {};                  // macCode -> bool
const mouse = { x: 0, y: 0, button: false, seen: false };
let eventsByTick = {};
const postedInput = [];               // [hwnd, msg, lParam] posted by us, allowed through the input filter

// busy-wait emulation for the current tick
let busy = null;
let pendingTs = {};                   // macCode -> timestamp served to the `the milliSeconds` read that
                                      // follows keyPressed(macCode) reporting the edge (KeyManager)
let msOverride = null;
let lastR2 = null;                    // `the milliSeconds` value served after the busy-wait passed

function tickTime(n) { return sched + Math.floor(n * 1000 / 30); }
function u32(v) { return Math.floor(v) >>> 0; }

// module ranges (pure JS lookups; Process.findModuleByAddress takes the loader lock)
let modRanges = [];                   // {name, base, end, game}
let getModuleHandleW = null;
function refreshModules() {
  const gd = cfg.gameDir.toLowerCase();
  // Process.enumerateModules() misses Dirapi/Iml32/Xtras in this process (and findModuleByName misses the
  // Xtras), so every module file of the game folder is also looked up with GetModuleHandleW and its size
  // taken from the PE header.
  if (!getModuleHandleW) getModuleHandleW = new NativeFunction(Process.getModuleByName('kernel32.dll').getExportByName('GetModuleHandleW'), 'pointer', ['pointer'], 'stdcall');
  const ranges = Process.enumerateModules().map((m) => ({
    name: m.name, base: m.base.toUInt32(), end: m.base.toUInt32() + m.size,
    game: m.path.toLowerCase().startsWith(gd) || m.name.toLowerCase() === 'msvcrt.dll'
  }));
  const seen = new Set(ranges.map((r) => r.base));
  for (const path of cfg.gameModules) {
    const h = getModuleHandleW(Memory.allocUtf16String(path));
    if (h.isNull() || seen.has(h.toUInt32())) continue;
    const size = h.add(h.add(0x3c).readU32() + 0x50).readU32();   // IMAGE_NT_HEADERS.OptionalHeader.SizeOfImage
    seen.add(h.toUInt32());
    ranges.push({ name: path.substring(path.lastIndexOf(String.fromCharCode(92)) + 1), base: h.toUInt32(), end: h.toUInt32() + size, game: true });
  }
  modRanges = ranges;
  const g = modRanges.filter((r) => r.game);
  const n = Math.min(g.length, 500);
  for (let i = 0; i < n; i++) { shared.ranges.add(i * 8).writeU32(g[i].base); shared.ranges.add(i * 8 + 4).writeU32(g[i].end); }
  shared.S.add(4).writeU32(n);
}
function modOff(p) {
  const a = p.toUInt32();
  for (const r of modRanges) if (a >= r.base && a < r.end) return r.name + '+' + (a - r.base).toString(16);
  return p.toString();
}

// ---------------------------------------------------------------------------------------------
// C gates
// ---------------------------------------------------------------------------------------------
// Shared memory written by JS, read by the gates.
const shared = {
  S: Memory.alloc(64),                // [0] mainTid [1] nRanges [2,3] cursor screen x,y [4,5] stage x,y
                                      // [6] mouse seen [8] qpf (double)
  ranges: Memory.alloc(500 * 8),      // game module [start, end) pairs
  keyvk: Memory.alloc(256),           // VK -> down (1/0)
  orig: Memory.alloc(4 * 32),         // original function pointers
  gameDirW: Memory.alloc(1040),
  gameDirA: Memory.alloc(520),
};
const ORIG = { GetTickCount: 0, GetTickCount64: 1, QPC: 2, FT: 3, FTP: 4, timeGetTime: 5, Sleep: 6,
               WaitMessage: 7, CreateFileW: 8, CreateFileA: 9, SetLastError: 10, GetCurrentThreadId: 11 };

const C_SOURCE = `
typedef unsigned int u32; typedef int s32; typedef unsigned long long u64; typedef long long s64;
typedef unsigned short u16;
#define STDCALL __attribute__((__stdcall__))
extern volatile u32 S[16];
extern volatile u32 ranges[1000];
extern volatile unsigned char keyvk[256];
extern void * volatile orig[32];
extern u16 gameDirW[520];
extern char gameDirA[520];
/* JS callbacks (cdecl), main thread only */
extern u32 js_tgt(void *ra);
extern u32 js_ms32(void *ra);
extern u64 js_ms64(void *ra);
extern void js_qpc(void *ra, s64 *p);
extern void js_ft(void *ra, u32 *p);
extern void js_sleep(u32 n);
extern void js_wait(void);
extern void js_game_opened(void);

typedef u32 (STDCALL *fn_u32_v)(void);
typedef u64 (STDCALL *fn_u64_v)(void);
typedef s32 (STDCALL *fn_s32_p)(void *);
typedef void (STDCALL *fn_v_p)(void *);
typedef void (STDCALL *fn_v_u32)(u32);
typedef s32 (STDCALL *fn_s32_v)(void);
typedef void *(STDCALL *fn_cf)(void *, u32, u32, void *, u32, u32, void *);

static int is_main(void) { return ((fn_u32_v) orig[11])() == S[0]; }
static int is_game(void *ra) {
  u32 a = (u32) ra, n = S[1], i;
  for (i = 0; i < n; i++) if (a >= ranges[2 * i] && a < ranges[2 * i + 1]) return 1;
  return 0;
}
#define RA(var) void *var = ((void **) __builtin_frame_address(0))[1]

u32 STDCALL g_GetTickCount(void) {
  RA(ra);
  if (!is_main() || !is_game(ra)) return ((fn_u32_v) orig[0])();
  return js_ms32(ra);
}
u64 STDCALL g_GetTickCount64(void) {
  RA(ra);
  if (!is_main() || !is_game(ra)) return ((fn_u64_v) orig[1])();
  return js_ms64(ra);
}
s32 STDCALL g_QPC(s64 *p) {
  RA(ra);
  if (!is_main() || !is_game(ra)) return ((fn_s32_p) orig[2])(p);
  js_qpc(ra, p);
  return 1;
}
static void ft_virtual(void *ra, u32 *p) { js_ft(ra, p); }
void STDCALL g_FT(u32 *p) {
  RA(ra);
  if (!is_main() || !is_game(ra)) { ((fn_v_p) orig[3])(p); return; }
  ft_virtual(ra, p);
}
void STDCALL g_FTP(u32 *p) {
  RA(ra);
  if (!is_main() || !is_game(ra)) { ((fn_v_p) orig[4])(p); return; }
  ft_virtual(ra, p);
}
u32 STDCALL g_timeGetTime(void) {
  RA(ra);
  if (!is_main() || !is_game(ra)) return ((fn_u32_v) orig[5])();
  return js_tgt(ra);
}
void STDCALL g_Sleep(u32 n) {
  if (!is_main()) { ((fn_v_u32) orig[6])(n); return; }
  js_sleep(n);
  ((fn_v_u32) orig[6])(0);
}
s32 STDCALL g_WaitMessage(void) {
  if (!is_main()) return ((fn_s32_v) orig[7])();
  js_wait();
  return 1;
}
s32 STDCALL g_GetAsyncKeyState(s32 vk) { return keyvk[vk & 255] ? (s32) (short) 0x8000 : 0; }
s32 STDCALL g_GetKeyState(s32 vk) { return keyvk[vk & 255] ? (s32) (short) 0xff80 : 0; }
s32 STDCALL g_GetKeyboardState(unsigned char *p) { int i; for (i = 0; i < 256; i++) p[i] = keyvk[i] ? 0x80 : 0; return 1; }
s32 STDCALL g_GetCursorPos(s32 *p) { p[0] = (s32) S[2]; p[1] = (s32) S[3]; return 1; }
u32 STDCALL g_GetMessagePos(void) { return ((S[3] & 0xffff) << 16) | (S[2] & 0xffff); }
s32 STDCALL g_FocusCheck(void *ctx) { return 1; }
s32 *STDCALL g_MousePos(void *win, s32 *out) {
  out[0] = S[6] ? (s32) S[4] : 0; out[1] = S[6] ? (s32) S[5] : 0;
  return out;
}

/* ---- CreateFile guard: the game folder is read-only ---- */
static int lc(int c) { if (c >= 'A' && c <= 'Z') return c + 32; if (c == 47) return 92; return c; }
static int is_dcr(int a, int b, int c, int d, int e, int f, int g, int h) {
  return a == 'g' && b == 'a' && c == 'm' && d == 'e' && e == '.' && f == 'd' && g == 'c' && h == 'r';
}
/* returns 1 if path is inside the game folder (relative paths count: cwd is the game folder) */
static int in_game_w(const u16 *p, int *isdcr) {
  int i = 0, j, n;
  *isdcr = 0;
  if (!p) return 0;
  if (p[0] == 92 && p[1] == 92 && p[2] == '?' && p[3] == 92) p += 4;
  else if ((p[0] == 92 || p[0] == 47) && (p[1] == 92 || p[1] == 47)) return 0;
  for (n = 0; p[n]; n++) ;
  if (n >= 8) {
    *isdcr = is_dcr(lc(p[n - 8]), lc(p[n - 7]), lc(p[n - 6]), lc(p[n - 5]), lc(p[n - 4]), lc(p[n - 3]), lc(p[n - 2]), lc(p[n - 1]))
             && (n == 8 || p[n - 9] == 92 || p[n - 9] == 47);
  }
  if (!(n >= 2 && p[1] == ':')) return 1;
  for (j = 0; gameDirW[j]; j++) if (j >= n || lc(p[j]) != gameDirW[j]) return 0;
  return 1;
}
static int in_game_a(const char *p, int *isdcr) {
  u16 buf[520]; int i;
  if (!p) { *isdcr = 0; return 0; }
  for (i = 0; i < 519 && p[i]; i++) buf[i] = (unsigned char) p[i];
  buf[i] = 0;
  return in_game_w(buf, isdcr);
}
static void *cf_common(int which, void *name, u32 access, u32 share, void *sa, u32 disp, u32 flags, void *tmpl) {
  int dcr = 0;
  int ing = which ? in_game_a((const char *) name, &dcr) : in_game_w((const u16 *) name, &dcr);
  if (ing) {
    if (disp == 1 || disp == 2 || disp == 5) {          /* CREATE_NEW, CREATE_ALWAYS, TRUNCATE_EXISTING */
      ((fn_v_u32) orig[10])(5);                          /* ERROR_ACCESS_DENIED */
      return (void *) -1;
    }
    if (access & (0x40000000 | 0x10000000 | 0x2 | 0x4 | 0x10000 | 0x100)) access = 0x80000000;
    share |= 3;
    if (disp == 4) disp = 3;                             /* OPEN_ALWAYS -> OPEN_EXISTING */
    if (dcr && is_main()) js_game_opened();
  }
  return ((fn_cf) orig[which ? 9 : 8])(name, access, share, sa, disp, flags, tmpl);
}
void *STDCALL g_CreateFileW(void *n, u32 a, u32 s, void *sa, u32 d, u32 f, void *t) { return cf_common(0, n, a, s, sa, d, f, t); }
void *STDCALL g_CreateFileA(void *n, u32 a, u32 s, void *sa, u32 d, u32 f, void *t) { return cf_common(1, n, a, s, sa, d, f, t); }
`;

let cm = null;
let qpf = 10000000;
const jsCallbacks = {};
function buildGates() {
  jsCallbacks.js_tgt = new NativeCallback((ra) => {
    let v = clockRead(ra);
    if (dir && ra.equals(dir.base.add(RVA_MS_READ))) v = msRead(Math.floor(v));
    return u32(v);
  }, 'uint32', ['pointer']);
  // 64-bit / FILETIME / QPC values are offset by 2^32 ms so they stay positive and monotonic.
  jsCallbacks.js_ms32 = new NativeCallback((ra) => u32(clockRead(ra)), 'uint32', ['pointer']);
  jsCallbacks.js_ms64 = new NativeCallback((ra) => uint64(Math.floor(clockRead(ra)) + 4294967296), 'uint64', ['pointer']);
  jsCallbacks.js_qpc = new NativeCallback((ra, p) => {
    p.writeS64(int64(Math.floor((clockRead(ra) + 4294967296) * (qpf / 1000))));
  }, 'void', ['pointer', 'pointer']);
  jsCallbacks.js_ft = new NativeCallback((ra, p) => {
    const v = (0x01C4A7B0n << 32n) + BigInt(Math.floor((clockRead(ra) + 4294967296) * 10000));
    p.writeU32(Number(v & 0xffffffffn)); p.add(4).writeU32(Number(v >> 32n));
  }, 'void', ['pointer', 'pointer']);
  jsCallbacks.js_sleep = new NativeCallback((n) => { if (phase === 'pre') vt += n; }, 'void', ['uint32']);
  jsCallbacks.js_wait = new NativeCallback(() => { if (phase === 'pre') vt += 1; }, 'void', []);
  jsCallbacks.js_game_opened = new NativeCallback(() => {
    if (!gameOpened && phase === 'pre') { gameOpened = true; seedRng(); }
  }, 'void', []);
  cm = new CModule(C_SOURCE, Object.assign({
    S: shared.S, ranges: shared.ranges, keyvk: shared.keyvk, orig: shared.orig,
    gameDirW: shared.gameDirW, gameDirA: shared.gameDirA,
  }, jsCallbacks));
}

// TinyCC decorates stdcall exports as _name@argbytes.
function gate(name) {
  const k = Object.keys(cm).find((x) => x === name || x.startsWith('_' + name + '@'));
  if (!k) throw new Error('CModule symbol not found: ' + name);
  return cm[k];
}
function setOrig(idx, p) { shared.orig.add(idx * 4).writePointer(p); }

function installGates() {
  shared.S.writeU32(mainTid);
  const gd = cfg.gameDir.toLowerCase().replace(/\//g, '\\');
  shared.gameDirW.writeUtf16String(gd);
  shared.gameDirA.writeAnsiString(gd);
  const k32 = Process.getModuleByName('kernel32.dll'), kb = Process.getModuleByName('kernelbase.dll');
  const u = Process.getModuleByName('user32.dll');
  setOrig(ORIG.GetCurrentThreadId, k32.getExportByName('GetCurrentThreadId'));
  setOrig(ORIG.SetLastError, kb.getExportByName('SetLastError'));
  const f = Memory.alloc(8);
  new NativeFunction(kb.getExportByName('QueryPerformanceFrequency'), 'int', ['pointer'], 'stdcall')(f);
  qpf = f.readS64().toNumber();
  buildGates();
  // Replace in kernelbase (kernel32 exports forward/jump there). replaceFast returns the original.
  const rf = (mod, fn, g, idx) => {
    const a = mod.findExportByName(fn);
    if (!a) return;
    const o = Interceptor.replaceFast(a, gate(g));
    if (idx !== undefined) setOrig(idx, o);
  };
  rf(kb, 'GetTickCount', 'g_GetTickCount', ORIG.GetTickCount);
  rf(kb, 'GetTickCount64', 'g_GetTickCount64', ORIG.GetTickCount64);
  rf(kb, 'QueryPerformanceCounter', 'g_QPC', ORIG.QPC);
  rf(kb, 'GetSystemTimeAsFileTime', 'g_FT', ORIG.FT);
  rf(kb, 'GetSystemTimePreciseAsFileTime', 'g_FTP', ORIG.FTP);
  rf(kb, 'Sleep', 'g_Sleep', ORIG.Sleep);
  rf(kb, 'CreateFileW', 'g_CreateFileW', ORIG.CreateFileW);
  rf(kb, 'CreateFileA', 'g_CreateFileA', ORIG.CreateFileA);
  // kernel32's own GetTickCount/QPC may not jump to kernelbase on every Windows build: check.
  for (const fn of ['GetTickCount', 'QueryPerformanceCounter', 'GetSystemTimeAsFileTime']) {
    const a32 = k32.findExportByName(fn), ab = kb.findExportByName(fn);
    if (a32 && ab && !a32.equals(ab)) {
      try { Interceptor.replaceFast(a32, gate({ GetTickCount: 'g_GetTickCount', QueryPerformanceCounter: 'g_QPC', GetSystemTimeAsFileTime: 'g_FT' }[fn])); } catch (e) {}
    }
  }
  rf(u, 'WaitMessage', 'g_WaitMessage', ORIG.WaitMessage);
  rf(u, 'GetAsyncKeyState', 'g_GetAsyncKeyState');
  rf(u, 'GetKeyState', 'g_GetKeyState');
  rf(u, 'GetKeyboardState', 'g_GetKeyboardState');
  rf(u, 'GetCursorPos', 'g_GetCursorPos');
  rf(u, 'GetMessagePos', 'g_GetMessagePos');
  hookWinmm();
}
let winmmDone = false;
function hookWinmm() {
  // All Director clocks go through Iml32 0x6902D5C0 = jmp [timeGetTime] (docs/DIRECTOR_INTERNALS.md s.2), so the return
  // address seen by the gate is the Dirapi/Iml32 call site.
  if (winmmDone) return;
  const m = Process.findModuleByName('winmm.dll');
  if (!m) return;
  winmmDone = true;
  setOrig(ORIG.timeGetTime, Interceptor.replaceFast(m.getExportByName('timeGetTime'), gate('g_timeGetTime')));
}

// ---------------------------------------------------------------------------------------------
// Virtual clock (main thread, game callers only -- the gates filter everything else)
// ---------------------------------------------------------------------------------------------
function clockRead(site) {
  if (phase === 'pre') { vt += PRE_EPS_MS; return vt; }
  if (phase !== 'game') return vt;
  const k = site.toString();
  const pv = privateSites.get(k);
  if (pv !== undefined) { const nv = Math.max(pv + 100000, vt); privateSites.set(k, nv); return nv; }
  readsInTick++;
  if (cfg.diagFrom && tick >= cfg.diagFrom && readsInTick < 400) diag('r ' + modOff(site));
  if (readsInTick > SITE_LOG_READS) {
    if (!siteHist) siteHist = {};
    const s = modOff(site);
    siteHist[s] = (siteHist[s] || 0) + 1;
  }
  if (readsInTick > HANG_READS) {
    vt += HANG_EPS_MS;
    if (!hangWarned) {
      hangWarned = true;
      let bt = '';
      try { bt = Thread.backtrace(undefined, Backtracer.FUZZY).slice(0, 16).map(modOff).join(' < '); } catch (e) {}
      log('WARNING: hang breaker engaged in tick ' + tick + ' (nondeterminism risk); hot read sites: ' + JSON.stringify(siteHist) + ' stack: ' + bt);
    }
  }
  return vt;
}

// `the milliSeconds` (Dirapi 0x6801ED97) read: key-edge timestamps and the busy-wait emulation.
function msRead(v) {
  if (msOverride !== null) { const o = msOverride; msOverride = null; return o; }
  if (phase !== 'game' || !busy || busy.passed) {
    if (busy && busy.passed && !busy.r2) { busy.r2 = true; lastR2 = v; }
    return v;
  }
  if (!busy.sawLast) return v;        // not the busy-wait check (no full key pass since the last check)
  busy.sawLast = false;
  // This is the check `(the milliSeconds - g.frameTimestamp) >= 33` after a full 42-key pass.
  if (busy.iter < busy.trans.length && lastR2 !== null) {
    // More key transitions this tick: fail the check so the loop polls again (one pass per transition,
    // like the port's runBusyWait), then apply the next transition.
    busy.iter++;
    applyTransitionsUpTo(busy.iter);
    return lastR2;
  }
  busy.passed = true;
  applyTransitionsUpTo(busy.trans.length);
  return v;
}

// ---------------------------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------------------------
function setVk(vk, down) { if (vk > 0 && vk < 256) shared.keyvk.add(vk).writeU8(down ? 1 : 0); }

// Transitions of the current tick are applied progressively by the busy-wait emulation: pass i of the
// game's key poll sees transitions 0..i. Each changed key gets the timestamp
// floor(clamp(prevClock + subMs, prevClock, clock)), like the port (src/main.ts installTestMode).
function applyTransitionsUpTo(n) {
  if (!busy) return;
  while (busy.applied < Math.min(n + 1, busy.trans.length)) {
    const t = busy.trans[busy.applied++];
    const was = !!keyState[t.mac];
    keyState[t.mac] = t.down;
    setVk(t.vk, t.down);
    if (was !== t.down) pendingTs[t.mac] = t.ts; else delete pendingTs[t.mac];
  }
}

function startTickInput(n) {
  const evs = eventsByTick[n] || [];
  const prevClock = sched + (n - 1) * 1000 / 30, clock = sched + n * 1000 / 30;
  const trans = [];
  evs.forEach((e, i) => {
    if (e.type !== 'key') return;
    const t = Math.min(clock, Math.max(prevClock, prevClock + (e.subMs || 0)));
    trans.push({ mac: e.mac, vk: e.vk, down: !!e.down, ts: Math.floor(t), t, i });
  });
  trans.sort((a, b) => a.t - b.t || a.i - b.i);
  pendingTs = {};
  msOverride = null;
  busy = { trans, applied: 0, iter: 0, sawLast: false, passed: false, r2: false };
  applyTransitionsUpTo(0);
}

let lastPasses = 0;                   // busy-wait key-poll passes in the last tick (diagnostics)
function finishTickInput() {
  lastPasses = busy ? (busy.passed ? busy.iter + 1 : 0) : 0;
  if (busy && busy.applied < busy.trans.length) {
    log('WARNING: tick ' + tick + ': key transitions applied without a busy-wait pass');
    applyTransitionsUpTo(busy.trans.length);
  }
  busy = null;
  msOverride = null;
}

let realPost = null, realClientToScreen = null;
function stageHwnd() {
  try { if (score) return score.add(0x24).readPointer().add(4).readPointer(); } catch (e) {}
  return ptr(0);
}
function updateMouseShared() {
  if (cfg.diagFrom) diag('updateMouseShared ' + mouse.x + ',' + mouse.y + ' hwnd=' + stageHwnd());
  shared.S.add(16).writeS32(mouse.x); shared.S.add(20).writeS32(mouse.y); shared.S.add(24).writeU32(mouse.seen ? 1 : 0);
  const pt = Memory.alloc(8); pt.writeS32(mouse.x); pt.add(4).writeS32(mouse.y);
  const h = stageHwnd();
  if (!h.isNull()) realClientToScreen(h, pt);
  shared.S.add(8).writeS32(pt.readS32()); shared.S.add(12).writeS32(pt.add(4).readS32());
}

// Mouse events of tick n are delivered before tick n starts: posted at the end of tick n-1 (dispatched by
// Proj's PeekMessage loop between the frames); the polled position is updated at the same time.
function postMouseEvents(n) {
  let any = false;
  for (const e of eventsByTick[n] || []) {
    if (e.type !== 'move' && e.type !== 'down' && e.type !== 'up') continue;
    any = true;
    const moved = !mouse.seen || mouse.x !== (e.x | 0) || mouse.y !== (e.y | 0);
    mouse.x = e.x | 0; mouse.y = e.y | 0; mouse.seen = true;
    if (e.type !== 'move') { mouse.button = e.type === 'down'; setVk(1, mouse.button); }
    updateMouseShared();
    const hwnd = stageHwnd();
    if (hwnd.isNull()) { log('WARNING: mouse ' + e.type + ' for tick ' + n + ' but no stage window'); continue; }
    const lp = ((e.y & 0xffff) << 16) | (e.x & 0xffff);
    // A WM_MOUSEMOVE first: Director's stage handler (FUN_68075129) only tracks the mouse (rollover,
    // mouseEnter/mouseLeave) after it has seen a mouse-move event; its position comes from GetMessagePos,
    // which the gate answers with the scripted position.
    const msgs = (moved || e.type === 'move') ? [WM_MOUSEMOVE] : [];
    if (e.type === 'down') msgs.push(WM_LBUTTONDOWN);
    if (e.type === 'up') msgs.push(WM_LBUTTONUP);
    for (const msg of msgs) {
      const wp = (msg === WM_MOUSEMOVE ? mouse.button : msg === WM_LBUTTONDOWN) ? MK_LBUTTON : 0;
      postedInput.push([hwnd.toString(), msg, lp >>> 0]);
      realPost(hwnd, msg, ptr(wp), ptr(lp));
    }
  }
  if (any) updateMouseShared();
}

function installInputFilter() {
  const u = Process.getModuleByName('user32.dll');
  realClientToScreen = new NativeFunction(u.getExportByName('ClientToScreen'), 'int', ['pointer', 'pointer'], 'stdcall');
  realPost = new NativeFunction(u.getExportByName('PostMessageA'), 'int', ['pointer', 'uint', 'pointer', 'pointer'], 'stdcall');
  // Only input messages we posted reach the game (real mouse/keyboard activity is dropped). Main thread
  // only (that is where the stage window lives); other threads' message loops are left alone.
  const isInput = (m) => (m >= 0x100 && m <= 0x109) || (m >= 0x200 && m <= 0x20e) || (m >= 0xa0 && m <= 0xad) || m === 0x2a1 || m === 0x2a3;
  const filter = (msgPtr, removing) => {
    const m = msgPtr.add(4).readU32();
    if (!isInput(m)) return;
    const hwnd = msgPtr.readPointer().toString(), lp = msgPtr.add(12).readU32();
    const h = postedInput[0];
    if (h && h[0] === hwnd && h[1] === m && h[2] === lp) { if (removing) { postedInput.shift(); if (cfg.diagFrom) diag('pass msg ' + m.toString(16)); } return; }
    if (cfg.diagFrom && removing) diag('drop msg ' + m.toString(16) + ' lp=' + lp.toString(16));
    msgPtr.add(4).writeU32(WM_NULL);
  };
  for (const fn of ['PeekMessageA', 'PeekMessageW', 'GetMessageA', 'GetMessageW']) {
    const peek = fn.startsWith('Peek');
    Interceptor.attach(u.getExportByName(fn), {
      onEnter(a) { this.main = this.threadId === mainTid; this.msg = a[0]; this.rm = peek ? (a[4].toInt32() & 1) !== 0 : true; },
      onLeave(rv) { if (this.main && (peek ? rv.toInt32() !== 0 : rv.toInt32() > 0)) filter(this.msg, this.rm); }
    });
  }
}

function installDirectorInput() {
  // keyPressed(macCode) -> Iml32 KeyPressedMac: scripted state; marks the end of a 42-key pass.
  Interceptor.replace(iml.base.add(IML_KEY_PRESSED_MAC), new NativeCallback((code) => {
    code &= 0xff;
    if (pendingTs[code] !== undefined) {
      msOverride = pendingTs[code];   // KeyManager.checkKey reads `the milliSeconds` right after the edge
      delete pendingTs[code];
    }
    if (busy && code === MAC_LAST_POLLED) busy.sawLast = true;
    // Mac codes 128/129 are the mouse buttons (Iml32 VK->Mac table: VK_LBUTTON -> 128, VK_RBUTTON -> 129);
    // Director polls 128 to detect the button release that ends a click (sprite mouseUp).
    if (code === 128) return mouse.button ? 1 : 0;
    if (code === 129) return 0;
    return keyState[code] ? 1 : 0;
  }, 'int', ['int'], 'stdcall'));
  // keyPressed's focus gate: always focused, so hidden/background runs see the scripted keys.
  Interceptor.replaceFast(dir.base.add(RVA_FOCUS_CHECK), gate('g_FocusCheck'));
  // mouseLoc / rollover polling: scripted stage position ((0,0) until the script first moves the mouse,
  // like the original before its first WM_MOUSEMOVE).
  Interceptor.replaceFast(dir.base.add(RVA_MOUSE_POS), gate('g_MousePos'));
  if (cfg.regionTrace && !cfg.blitTrace) {  // stage update region only (the rect list FUN_68060660 flushes)
    const rect = (p) => [0, 4, 8, 12].map((o) => p.add(o).readS32()).join(',');
    Interceptor.attach(dir.base.add(0x60660), {
      onEnter(a) {
        if (tick < cfg.regionTrace[0] || tick > cfg.regionTrace[1]) return;
        const w = a[1], n = w.add(0x2c).readS32(), p = w.add(0x24).readPointer(), r = [];
        for (let i = 0; i < n && i < 256; i++) r.push('[' + rect(p.add(i * 16)) + ']');
        diag('REGION t=' + tick + ' dirty=' + w.add(0xbc).readS32() + ' ' + n + ':' + r.join(''));
      },
    });
    // render-time palette switches (FUN_6805c880; a switch invalidates the whole stage on a 32-bit stage)
    Interceptor.attach(dir.base.add(0x5c880), {
      onEnter(a) {
        if (tick < cfg.regionTrace[0] || tick > cfg.regionTrace[1]) return;
        const nw = a[2].toUInt32() >>> 0, cur = a[1].add(0x30).readU32() >>> 0;
        if (nw !== cur && (nw >>> 16) !== 0) diag('PALETTE t=' + tick + ' new=0x' + nw.toString(16) + ' cur=0x' + cur.toString(16));
      },
    });
  }
  if (cfg.blitTrace) {  // renderer RE: every Iml32 blit (FUN_69001bf0) of ticks blitTrace[0]..blitTrace[1]
    const inRange = () => tick >= cfg.blitTrace[0] && tick <= cfg.blitTrace[1];
    const rect = (p) => (p.isNull() ? '-' : [0, 4, 8, 12].map((o) => p.add(o).readS32()).join(','));
    const info = (p) => (p.isNull() ? '-' : p.add(4).readS32() + 'x' + p.readS32() + 'd' + p.add(20).readS32() + 'f' + p.add(24).readS32());
    // Stage update region: Dirapi FUN_68060df4(stageWin, rect*) adds one rect to the update list (stageWin+0x24
    // rects, +0x2c count); FUN_68060660(score, stageWin) flushes the list at the render.
    const rlist = (w) => { const n = w.add(0x2c).readS32(), p = w.add(0x24).readPointer(), r = []; for (let i = 0; i < n && i < 64; i++) r.push('[' + rect(p.add(i * 16)) + ']'); return n + ':' + r.join(''); };
    Interceptor.attach(dir.base.add(0x60df4), {
      onEnter(a) {
        if (!inRange()) return;
        this.w = a[0];
        let bt = '';
        try { bt = Thread.backtrace(this.context, Backtracer.FUZZY).slice(0, 8).map(modOff).join(' '); } catch (e) {}
        diag('INVAL t=' + tick + ' rect=' + rect(a[1]) + ' bt=' + bt);
      },
      onLeave() { if (this.w) diag('  list ' + rlist(this.w)); },
    });
    // FUN_6807577b(upd*, rect*, slop): adds a rect to the stage update list (upd = stageWin+0x90; rects +0x38,
    // count +0x40, merge disabled when +0x48 != 0).
    const ulist = (u) => { const n = u.add(0x40).readS32(), p = u.add(0x38).readPointer(), r = []; for (let i = 0; i < n && i < 64; i++) r.push('[' + rect(p.add(i * 16)) + ']'); return n + ':' + r.join(''); };
    Interceptor.attach(dir.base.add(0x7577b), {
      onEnter(a) {
        if (!inRange()) return;
        this.u = a[0];
        let bt = '';
        try { bt = Thread.backtrace(this.context, Backtracer.FUZZY).slice(0, 12).map(modOff).join(' '); } catch (e) {}
        diag('ADD t=' + tick + ' rect=' + rect(a[1]) + ' slop=' + a[2].toInt32() + ' nomerge=' + a[0].add(0x48).readS32() + ' bt=' + bt);
      },
      onLeave() { if (this.u) diag('  upd ' + ulist(this.u)); },
    });
    // FUN_6805c880(score, stageWin, palette): the render-time palette switch (stageWin+0x30 = current palette).
    Interceptor.attach(dir.base.add(0x5c880), { onEnter(a) { if (inRange()) diag('PALETTE t=' + tick + ' new=0x' + (a[2].toUInt32() >>> 0).toString(16) + ' cur=0x' + (a[1].add(0x30).readU32() >>> 0).toString(16)); } });
    // FUN_68060c46(stageWin): invalidates the whole stage.
    Interceptor.attach(dir.base.add(0x60c46), {
      onEnter(a) {
        if (!inRange()) return;
        let bt = '';
        try { bt = Thread.backtrace(this.context, Backtracer.FUZZY).slice(0, 10).map(modOff).join(' '); } catch (e) {}
        diag('FULLSTAGE t=' + tick + ' bt=' + bt);
      },
    });
    // FUN_6806c671(channel S, slop): invalidates the channel's sprite.rect (S+0xC8) unless S+0x124.
    Interceptor.attach(dir.base.add(0x6c671), { onEnter(a) { if (inRange()) diag('CH ch=' + (a[0].add(0x40).readS32() + 1) + ' slop=' + a[1].toInt32() + ' f4c=0x' + a[0].add(0x4c).readU32().toString(16) + ' f124=' + a[0].add(0x124).readS32() + ' from ' + modOff(this.returnAddress)); } });
    // FUN_68060bab(list*, list2*): appends rect list 2 (+4 rects, +0xc count) to list (stageWin+0x20).
    const rlist2 = (l) => { const n = l.add(0xc).readS32(), p = l.add(4).readPointer(), r = []; for (let i = 0; i < n && i < 64; i++) r.push('[' + rect(p.add(i * 16)) + ']'); return n + ':' + r.join(''); };
    Interceptor.attach(dir.base.add(0x60bab), {
      onEnter(a) {
        if (!inRange()) return;
        let bt = '';
        try { bt = Thread.backtrace(this.context, Backtracer.FUZZY).slice(0, 8).map(modOff).join(' '); } catch (e) {}
        diag('APPEND t=' + tick + ' src=' + rlist2(a[1]) + ' bt=' + bt);
      },
    });
    Interceptor.attach(dir.base.add(0x60660), { onEnter(a) { if (inRange()) diag('REGION t=' + tick + ' dirty=' + a[1].add(0xbc).readS32() + ' ' + rlist(a[1])); } });
    Interceptor.attach(iml.base.add(0x39c00), { onEnter(a) { if (inRange()) diag('B1616 t=' + tick + ' from ' + modOff(this.returnAddress) + ' dstRect=' + rect(a[1]) + ' srcRect=' + rect(a[3])); } });
    // Ordinal_1634(dstImg, quad (4 points as doubles), srcImg, srcRect, mask, maskOffset, mode, colours, ...)
    const quad = (p) => { const v = []; for (let i = 0; i < 8; i++) v.push(p.add(i * 8).readDouble()); return v.join(','); };
    Interceptor.attach(iml.base.add(0x3a370), { onEnter(a) { if (inRange()) diag('B1634 t=' + tick + ' from ' + modOff(this.returnAddress) + ' quad=' + quad(a[1]) + ' a3=' + rect(a[3]) + ' a5=' + (a[5].isNull() ? '-' : a[5].readS32() + ',' + a[5].add(4).readS32())); } });
    Interceptor.attach(iml.base.add(0x1bf0), {
      onEnter(a) {
        if (!inRange()) return;
        let mode = '-';
        try { mode = a[6].isNull() ? '-' : [0, 4, 8, 12, 16].map((o) => '0x' + (a[6].add(o).readU32() >>> 0).toString(16)).join(','); } catch (e) {}
        let cols = '-';
        try { cols = a[7].isNull() ? '-' : '0x' + a[7].readU32().toString(16) + ',0x' + a[7].add(4).readU32().toString(16); } catch (e) {}
        let quad = '-';
        try { if (!a[14].isNull()) quad = 'yes'; } catch (e) {}
        diag('BLIT t=' + tick + ' from ' + modOff(this.returnAddress) + ' dst=' + info(a[0]) + ' dstFull=' + rect(a[1]) + ' src=' + info(a[2]) +
          ' srcFull=' + rect(a[3]) + ' mask=' + (a[4].isNull() ? '-' : info(a[4])) + ' mode=' + mode + ' cols=' + cols + ' p9=' + a[8].toInt32() +
          ' dstClip=' + rect(a[9]) + ' srcClip=' + rect(a[10]) + ' quad=' + quad + ' p16=' + a[15].toInt32());
      },
    });
  }
  if (cfg.diagFrom) {   // diagnostics: idle step (rollover deadline) and rollover gate
    Interceptor.attach(dir.base.add(0xfe04), { onEnter(a) { if (tick >= cfg.diagFrom) { const p = a[0]; diag('fe04 busy=' + p.readPointer().add(0x68).readU32() + ' period=' + p.add(0x759c).readS32() + ' next=' + p.add(0x75a0).readU32() + ' vt=' + vt); } } });
    Interceptor.attach(dir.base.add(0xff13), { onEnter(a) { if (tick >= cfg.diagFrom) { const p = a[0]; diag('ff13 g0c=' + dir.base.add(0x152070).readPointer().add(0xc).readU32() + ' 79ac=' + p.add(0x79ac).readU32()); } } });
  }
}

// ---------------------------------------------------------------------------------------------
// Tick detection and capture
// ---------------------------------------------------------------------------------------------
function onPlayerStep(player) {
  const st = player.add(OFF_PLAYER_STATE).readS32();
  if (cfg.diagFrom && tick >= cfg.diagFrom) diag('S' + st);
  if (st === STATE_FRAME_BEGIN) {
    if (phase === 'pre') {
      // Tick 1 = the first frame cycle after game.dcr was opened (gamewrapper.dir's go(1,"game.dcr");
      // game.dcr's prepareMovie runs between the open and this frame).
      if (!gameOpened) return;
      phase = 'game';
      tick = 0;
      refreshModules();
      log('game modules: ' + modRanges.filter((r) => r.game).map((r) => r.name).join(', '));
      log('tick 1 starts (game.dcr); rng state=' + dir.base.add(RVA_RNG_STATE).readU32() + ' pre-phase clock=' + vt.toFixed(1));
      if (vt >= tickTime(1)) log('WARNING: pre-phase clock passed the game epoch; schedule will shift');
      postMouseEvents(1);
    }
    if (phase !== 'game') return;
    tick++;
    inTick = true;
    readsInTick = 0; hangWarned = false; siteHist = null; rendersInTick = 0;
    vt = Math.max(vt, tickTime(tick));
    startTickInput(tick);
  } else if (st === STATE_FRAME_END && inTick && phase === 'game') {
    inTick = false;
    finishTickInput();
    capture();
    // Class_Main.update busy-waits until `the milliSeconds - frameTimestamp >= 33` (integer). The next
    // tick must start >= 33 ms after what it read as frameTimestamp, and the clock never goes back.
    const need = Math.max(Math.ceil(vt), lastR2 === null ? -Infinity : lastR2 + 33);
    if (need > tickTime(tick + 1)) {
      const shift = need - tickTime(tick + 1);
      sched += shift;
      log('WARNING: tick ' + tick + ' overran its slot by ' + shift + ' ms; schedule shifted');
    }
    vt = Math.max(vt, tickTime(tick + 1));
    if (tick >= cfg.ticks) {
      phase = 'done';
      send({ type: 'done', tick });
      recv('quit', () => {}).wait();   // park the main thread until the harness kills the process
      return;
    }
    postMouseEvents(tick + 1);
  }
}

function readStage() {
  if (!score) return null;
  const stageWin = score.add(0x24).readPointer();
  const id = stageWin.add(0x94).readS32();
  if (id < 1) return null;
  const info = iml.base.add(IML_OFFSCREEN_TABLE + (id - 1) * 0x54).readPointer();
  if (info.isNull()) return null;
  return { height: info.readS32(), width: info.add(4).readS32(), stride: info.add(8).readS32(),
           bits: info.add(0x10).readPointer(), bpp: info.add(0x14).readS32() };
}

// Per-channel sprite state exactly as Lingo's sprite getters see it (Dirapi FUN_68011EAB ->
// FUN_6802CE20; layout in docs/DIRECTOR_INTERNALS.md section 5). Returns compact rows
// [ch, castLib, member, locH, locV, left, top, right, bottom, ink, blend, locZ, visible, puppet, flipH,
//  flipV, rotation] for every channel 1..N that holds a member (castLib/member != 0).
let frameLock = null, frameUnlock = null, warnedRectXform = false;
function dumpSprites() {
  if (!frameLock) {
    frameLock = new NativeFunction(dir.base.add(RVA_FRAME_LOCK), 'int', ['pointer', 'pointer', 'pointer'], 'stdcall');
    frameUnlock = new NativeFunction(dir.base.add(RVA_FRAME_UNLOCK), 'void', ['pointer', 'pointer', 'pointer'], 'stdcall');
  }
  const h = score.add(0x28).readPointer();                 // frame-state handle; D = *h
  if (h.isNull()) return [];
  const chans = score.add(0x34).readPointer();             // channel structs, channel n at (n-1)*0x170
  const nStruct = score.add(0x2c).readS32();
  if (!warnedRectXform && score.add(0x12c).readS32() !== 0) {
    warnedRectXform = true;                                // FUN_6806225B would transform sprite rects
    log('WARNING: score+0x12C != 0: sprite rects are transformed by the stage (not applied in the dump)');
  }
  const out = [];
  const bufp = Memory.alloc(Process.pointerSize);
  const nFrame = frameLock(h, bufp, NULL);                 // locks the frame buffer (refcount), = channel count
  try {
    const buf = bufp.readPointer();
    if (buf.isNull()) return out;
    const d = h.readPointer();
    const n = Math.min(nStruct, nFrame);
    const be16 = (p) => { const v = (p.readU8() << 8) | p.add(1).readU8(); return v >= 0x8000 ? v - 0x10000 : v; };
    const be32 = (p) => (p.readU8() << 24) | (p.add(1).readU8() << 16) | (p.add(2).readU8() << 8) | p.add(3).readU8();
    for (let i = 0; i < n; i++) {
      const rec = buf.add(FRAME_REC_BASE + i * FRAME_REC_SIZE);
      const s = chans.add(i * CHAN_STRUCT_SIZE);
      const castLib = be16(rec.add(4)) & 0xffff, member = be16(rec.add(6)) & 0xffff;
      if (castLib === 0 || member === 0) continue;         // no member (the port's dump skips these too)
      const puppet = d.add(0x9c + i).readU8() !== 0;
      const floatLoc = (s.add(0x58).readU8() & 0x20) !== 0;
      const locH = floatLoc ? s.add(0x70).readS32() : be16(rec.add(0xe));
      const locV = floatLoc ? s.add(0x74).readS32() : be16(rec.add(0xc));
      const ink = rec.add(1).readU8() & 0x3f;
      const blend = 100 - Math.floor((rec.add(0x15).readU8() * 100 + 0x7f) / 0xff);
      const flags = rec.add(0x16).readU8();
      out.push([i + 1, castLib, member, locH, locV,
                s.add(0xc8).readS32(), s.add(0xcc).readS32(), s.add(0xd0).readS32(), s.add(0xd4).readS32(),
                ink, blend, s.add(0x44).readS32(), (s.add(0x50).readU32() & 2) === 0 ? 1 : 0, puppet ? 1 : 0,
                (flags >> 5) & 1, (flags >> 6) & 1, be32(rec.add(0x1c)) / 100]);    }
  } finally {
    frameUnlock(h, bufp, NULL);
  }
  return out;
}

function capture() {
  let frame = null;
  try { frame = score.add(0x28).readPointer().readPointer().add(0x70).readS32(); } catch (e) {}
  const meta = { type: 'frame', tick, frame, ms: tickTime(tick) - GAME_EPOCH_MS, clock: tickTime(tick), renders: rendersInTick, passes: lastPasses,
                 rngState: dir.base.add(RVA_RNG_STATE).readU32() };
  if (cfg.sprites) {
    try { meta.sprites = dumpSprites(); } catch (e) { meta.sprites = null; log('WARNING: sprite dump failed at tick ' + tick + ': ' + e); }
  }
  const s = readStage();
  if (!s || s.width !== 600 || s.height !== 400 || s.bpp !== 32) {
    meta.missing = true; meta.stage = s ? (s.width + 'x' + s.height + 'x' + s.bpp) : null;
    send(meta);
  } else {
    meta.width = s.width; meta.height = s.height; meta.stride = s.stride; meta.bpp = s.bpp;
    meta.topDown = false;   // bottom-up DIB rows (docs/DIRECTOR_INTERNALS.md s.4)
    send(meta, s.bits.readByteArray(s.stride * s.height));
  }
  recv('ack', () => {}).wait();   // lockstep: the game does not advance until the harness has the frame
}

function seedRng() {
  if (seeded || cfg.seed === null || cfg.seed === undefined || !dir) return;
  seeded = true;
  // `the randomSeed = seed` (docs/DIRECTOR_INTERNALS.md s.1), before game.dcr's prepareMovie, like the port.
  new NativeFunction(dir.base.add(RVA_SET_RANDOM_SEED), 'void', ['int'], 'stdcall')(cfg.seed | 0);
}

// ---------------------------------------------------------------------------------------------
// Sound: by default the audio devices are made unavailable, so `sound(n).isBusy()` (Class_AudioManager)
// is always false instead of depending on real playback progress.
// ---------------------------------------------------------------------------------------------
const noSoundDone = {};
function checkNoSound() {
  if (cfg.sound) return;
  const ds = Process.findModuleByName('dsound.dll');
  if (ds && !noSoundDone.ds) {
    noSoundDone.ds = true;
    const fail = new NativeCallback(() => 0x88780078 | 0, 'int', ['pointer', 'pointer', 'pointer'], 'stdcall');
    noSoundDone.cb = fail;
    for (const fn of ['DirectSoundCreate', 'DirectSoundCreate8']) {
      const a = ds.findExportByName(fn);
      if (a) Interceptor.replace(a, fail);
    }
    const e = ds.findExportByName('DirectSoundEnumerateA');
    if (e) Interceptor.replace(e, (noSoundDone.cb2 = new NativeCallback(() => 0, 'int', ['pointer', 'pointer'], 'stdcall')));
  }
  const wm = Process.findModuleByName('winmm.dll');
  if (wm && !noSoundDone.wm) {
    noSoundDone.wm = true;
    const a = wm.findExportByName('waveOutOpen');
    if (a) Interceptor.replace(a, (noSoundDone.cb3 = new NativeCallback(() => 6, 'uint32', ['pointer', 'uint32', 'pointer', 'pointer', 'pointer', 'uint32'], 'stdcall')));
    const g = wm.findExportByName('waveOutGetNumDevs');
    if (g) Interceptor.replace(g, (noSoundDone.cb4 = new NativeCallback(() => 0, 'uint32', [], 'stdcall')));
  }
}

// ---------------------------------------------------------------------------------------------
// Module load tracking (Process.attachModuleObserver misses Dirapi/Iml32 here, so hook LoadLibrary)
// ---------------------------------------------------------------------------------------------
let lastModKey = '';
function checkModules() {
  // (also refreshed at tick 1; the module snapshot count is a cheap change detector)
  const key = String(Process.enumerateModules().length);
  if (key !== lastModKey) { lastModKey = key; refreshModules(); }
  hookWinmm();
  checkNoSound();
  if (!iml) iml = Process.findModuleByName('IML32.dll');
  if (!dir && iml) {
    const m = Process.findModuleByName('DIRAPI.dll');
    if (m) {
      dir = m;
      privateSites = new Map(PRIVATE_CLOCK_SITES.map((r) => [m.base.add(r).toString(), 0]));
      Interceptor.attach(m.base.add(RVA_PLAYER_STEP), { onEnter(a) { onPlayerStep(a[0]); } });
      Interceptor.attach(m.base.add(RVA_STAGE_RENDER), { onEnter(a) { score = a[0]; if (inTick) rendersInTick++; } });
      installDirectorInput();
      log('Dirapi at ' + m.base + ' (' + m.path + '), Iml32 at ' + iml.base + ' (' + iml.path + ')');
    }
  }
}

rpc.exports = {
  init(c) {
    cfg = c;
    mainTid = Process.enumerateThreads()[0].id;
    for (const e of cfg.events) (eventsByTick[e.tick] = eventsByTick[e.tick] || []).push(e);
    refreshModules();
    installGates();
    installInputFilter();
    // Module loads: only the main thread runs our JS here (worker-thread loads are picked up later).
    for (const fn of ['LoadLibraryExW', 'LoadLibraryExA', 'LoadLibraryW', 'LoadLibraryA']) {
      const a = Process.getModuleByName('kernelbase.dll').findExportByName(fn);
      if (a) Interceptor.attach(a, { onEnter() { this.main = this.threadId === mainTid; }, onLeave() { if (this.main) checkModules(); } });
    }
    checkModules();
    diag('agent init ' + new Date().toISOString());
    if (cfg.diagFrom) {
      const u = Process.getModuleByName('user32.dll');
      for (const fn of ['SetCapture', 'ReleaseCapture', 'GetCapture', 'GetQueueStatus', 'GetInputState', 'GetSystemMetrics', 'SwapMouseButton']) {
        const a = u.findExportByName(fn);
        if (a) Interceptor.attach(a, { onEnter(args) { if (this.threadId === mainTid && tick >= cfg.diagFrom) diag(fn + '(' + args[0].toInt32() + ') <- ' + modOff(this.returnAddress)); } });
      }
    }
    return { mainTid };
  }
};
