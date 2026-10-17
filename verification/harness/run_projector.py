"""Verification harness: run the ORIGINAL Teen Titans Battle Blitz (Projector.exe, Director MX 2004) under
Frida with a virtual clock and scripted input, and capture one 600x400 PNG per game.dcr tick.

Usage (from the project root; needs the frida and Pillow packages):
    python verification\\harness\\run_projector.py verification\\scenarios\\<name>.json [--ticks N] [--show]
        [--out DIR] [--sound] [--timeout SEC] [--wait-other SEC] [--verbose] [--diag-from TICK] [--sprites]

Output: local/captures/<scenario>/projector/frames/NNNNNN.png + frames.json (format: docs/VERIFICATION.md).
--sprites also writes sprites.json (Director's per-tick sprite channel state, same format as the port's
`run_port.mjs --sprites`; compare with verification/diff/sprites_diff.mjs).
Existing PNGs are overwritten in place (nothing is ever deleted); if the target folder holds frames beyond
the requested tick count, a fresh folder projector_2, projector_3, ... is used instead.
Only one Projector.exe may run at a time (a second instance stalls after opening game.dcr, see
docs/DIRECTOR_INTERNALS.md section 0): the harness waits up to --wait-other seconds for others to exit, then refuses.
The Projector.exe process is always killed at the end (normal exit, error, Ctrl+C); it is also placed in a
Job object with KILL_ON_JOB_CLOSE so it dies with this Python process even if Python is killed hard.
See docs/VERIFICATION.md for the design.
"""
import argparse
import ctypes
import json
import os
import queue
import sys
import threading
import time
from ctypes import wintypes

import frida
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))  # project root (verification/harness/ -> ../..)
LOCAL = os.path.join(ROOT, "local")
# The original game folder (Projector.exe, game.dcr, casts, Xtras); see docs/VERIFICATION.md
GAME_DIR = os.path.join(LOCAL, "run", "ttbattleblitz")
PROJECTOR = os.path.join(GAME_DIR, "Projector.exe")

# Browser KeyboardEvent.code -> Mac key code (what Lingo keyPressed() takes; table in docs/DIRECTOR_INTERNALS.md s.3)
KEY_MAC = {"ArrowLeft": 123, "ArrowRight": 124, "ArrowDown": 125, "ArrowUp": 126, "Space": 49, "Escape": 53,
           "Enter": 36, "NumpadEnter": 36, "Tab": 48, "Backspace": 51,
           "Digit1": 18, "Digit2": 19, "Digit3": 20, "Digit4": 21, "Digit5": 23, "Digit6": 22, "Digit7": 26,
           "Digit8": 28, "Digit9": 25, "Digit0": 29}
for _k, _m in zip("ABCDEFGHIJKLMNOPQRSTUVWXYZ",
                  [0, 11, 8, 2, 14, 3, 5, 4, 34, 38, 40, 37, 46, 45, 31, 35, 12, 15, 1, 17, 32, 9, 13, 7, 16, 6]):
    KEY_MAC["Key" + _k] = _m

# Browser KeyboardEvent.code -> Windows virtual-key code (only for code polling GetAsyncKeyState directly)
KEY_VK = {"Space": 0x20, "Escape": 0x1B, "Enter": 0x0D, "NumpadEnter": 0x0D, "Tab": 0x09, "Backspace": 0x08,
          "ArrowLeft": 0x25, "ArrowUp": 0x26, "ArrowRight": 0x27, "ArrowDown": 0x28,
          "ShiftLeft": 0x10, "ShiftRight": 0x10, "ControlLeft": 0x11, "ControlRight": 0x11,
          "AltLeft": 0x12, "AltRight": 0x12, "Minus": 0xBD, "Equal": 0xBB, "BracketLeft": 0xDB,
          "BracketRight": 0xDD, "Backslash": 0xDC, "Semicolon": 0xBA, "Quote": 0xDE, "Comma": 0xBC,
          "Period": 0xBE, "Slash": 0xBF, "Backquote": 0xC0}
for _c in range(26):
    KEY_VK["Key" + chr(65 + _c)] = 65 + _c
for _d in range(10):
    KEY_VK["Digit%d" % _d] = 48 + _d
    KEY_VK["Numpad%d" % _d] = 0x60 + _d

k32 = ctypes.WinDLL("kernel32", use_last_error=True)
u32 = ctypes.WinDLL("user32", use_last_error=True)


class JobKiller:
    """Windows Job object with JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: the child dies when we do."""

    def __init__(self):
        self.job = k32.CreateJobObjectW(None, None)

        class BASIC(ctypes.Structure):
            _fields_ = [("PerProcessUserTimeLimit", ctypes.c_int64), ("PerJobUserTimeLimit", ctypes.c_int64),
                        ("LimitFlags", wintypes.DWORD), ("MinimumWorkingSetSize", ctypes.c_size_t),
                        ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", wintypes.DWORD),
                        ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD),
                        ("SchedulingClass", wintypes.DWORD)]

        class IOC(ctypes.Structure):
            _fields_ = [(n, ctypes.c_uint64) for n in ("a", "b", "c", "d", "e", "f")]

        class EXT(ctypes.Structure):
            _fields_ = [("Basic", BASIC), ("Io", IOC), ("ProcessMemoryLimit", ctypes.c_size_t),
                        ("JobMemoryLimit", ctypes.c_size_t), ("PeakProcessMemoryUsed", ctypes.c_size_t),
                        ("PeakJobMemoryUsed", ctypes.c_size_t)]

        info = EXT()
        info.Basic.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        k32.SetInformationJobObject(self.job, 9, ctypes.byref(info), ctypes.sizeof(info))

    def add(self, pid):
        h = k32.OpenProcess(0x1F0FFF, False, pid)
        if h:
            k32.AssignProcessToJobObject(self.job, h)
            k32.CloseHandle(h)


def find_windows(pid, titles=False):
    res = []

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def cb(h, _l):
        p = wintypes.DWORD()
        u32.GetWindowThreadProcessId(h, ctypes.byref(p))
        if p.value == pid:
            cls = ctypes.create_unicode_buffer(64)
            u32.GetClassNameW(h, cls, 64)
            item = (h, cls.value, bool(u32.IsWindowVisible(h)))
            if titles:
                t = ctypes.create_unicode_buffer(256)
                u32.GetWindowTextW(h, t, 256)
                item += (t.value,)
            res.append(item)
        return True

    u32.EnumWindows(cb, 0)
    return res


def child_texts(hwnd):
    out = []

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def cb(h, _l):
        t = ctypes.create_unicode_buffer(1024)
        u32.GetWindowTextW(h, t, 1024)
        if t.value:
            out.append(t.value)
        return True

    u32.EnumChildWindows(hwnd, cb, 0)
    return " | ".join(out)


def hide_windows(pid, done):
    """Keep the projector's windows off-screen and out of the way (they stay 'visible' so Director keeps
    rendering normally; capture reads the offscreen stage buffer, not the screen)."""
    SWP_NOSIZE, SWP_NOZORDER, SWP_NOACTIVATE = 0x1, 0x4, 0x10
    seen = set()
    while not done.is_set():
        for h, cls, vis in find_windows(pid):
            if vis and h not in seen:
                u32.SetWindowPos(h, None, -4000, -4000, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE)
                seen.add(h)
        done.wait(0.02)


def to_image(meta, data):
    w, h, bpp, stride = meta["width"], meta["height"], meta["bpp"], meta["stride"]
    orient = 1 if meta["topDown"] else -1
    if bpp == 32:
        return Image.frombuffer("RGB", (w, h), data, "raw", "BGRX", stride, orient)
    if bpp == 24:
        return Image.frombuffer("RGB", (w, h), data, "raw", "BGR", stride, orient)
    if bpp == 16:
        return Image.frombuffer("RGB", (w, h), data, "raw", "BGR;15", stride, orient)
    if bpp == 8:
        pl = meta["paletteLen"]
        pal, px = data[:pl], data[pl:]
        im = Image.frombuffer("P", (w, h), px, "raw", "P", stride, orient)
        rgb = []
        for i in range(0, pl, 4):
            rgb += [pal[i + 2], pal[i + 1], pal[i]]
        im.putpalette(rgb)
        return im.convert("RGB")
    raise ValueError("unsupported stage bpp %d" % bpp)


def game_module_names():
    """Full paths of all loadable modules in the game folder (exe, dlls, Xtras)."""
    paths = []
    for root, _dirs, files in os.walk(GAME_DIR):
        paths += [os.path.join(root, f) for f in files if f.lower().endswith((".exe", ".dll", ".x32"))]
    return sorted(paths)


def projector_pids():
    import subprocess
    r = subprocess.run(["tasklist", "/FI", "IMAGENAME eq Projector.exe", "/FO", "CSV", "/NH"],
                       capture_output=True, text=True)
    pids = []
    for line in r.stdout.splitlines():
        parts = [x.strip('"') for x in line.split('","')]
        if len(parts) > 1 and parts[0].lower() == "projector.exe":
            pids.append(int(parts[1]))
    return pids


def wait_for_other_projectors(limit):
    t0 = time.time()
    while True:
        pids = projector_pids()
        if not pids:
            return
        if time.time() - t0 > limit:
            sys.exit("another Projector.exe is running (pid %s); only one instance may run at a time" % pids)
        print("waiting for other Projector.exe (pid %s) to exit..." % pids, flush=True)
        time.sleep(2)


CASTS_JSON = os.path.join(ROOT, "public", "data", "casts.json")
PORT_TYPES = {"bitmap", "sound", "text", "field", "script", "shape", "palette", "filmloop", "flash"}


def load_member_names():
    """(castLib, member) -> "name (type)" using the port's casts.json (same naming as the port's dump)."""
    names = {}
    try:
        with open(CASTS_JSON, encoding="utf-8") as f:
            casts = json.load(f)
    except OSError:
        return names
    for cl in casts["castLibs"]:
        for m in cl["members"]:
            t = m["type"] if m["type"] in PORT_TYPES else "other"
            names[(cl["number"], m["number"])] = "%s (%s)" % (m.get("name") or "", t)
    return names


def sprite_rows_to_port(rows, names):
    """Agent rows -> the port's window.__tt.sprites() objects (src/main.ts), field for field.
    `behaviors` is null: the original's scriptInstanceList is not read (the comparer skips null fields)."""
    out = []
    for (ch, cl, mem, lh, lv, l, t, r, b, ink, blend, locz, vis, pup, fh, fv, rot) in rows:
        out.append({"ch": ch, "member": "%d:%d %s" % (cl, mem, names.get((cl, mem), "? (empty)")),
                    "rect": "rect(%d, %d, %d, %d)" % (l, t, r, b), "ink": ink, "locZ": locz,
                    "visible": bool(vis), "puppet": bool(pup), "loc": "%d,%d" % (lh, lv), "blend": blend,
                    "flipH": bool(fh), "flipV": bool(fv), "rotation": rot if rot != int(rot) else int(rot),
                    "behaviors": None})
    return out


def pick_out_dir(out, ticks):
    """Never delete: reuse the folder (PNGs get overwritten) unless it holds frames past `ticks`."""
    base, n = out, 1
    while True:
        fd = os.path.join(out, "frames")
        extra = [f for f in (os.listdir(fd) if os.path.isdir(fd) else [])
                 if f.endswith(".png") and f[:-4].isdigit() and int(f[:-4]) > ticks]
        if not extra:
            return out
        n += 1
        out = "%s_%d" % (base, n)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script")
    ap.add_argument("--ticks", type=int, help="override the script's tick count")
    ap.add_argument("--show", action="store_true", help="leave the projector window on screen")
    ap.add_argument("--out", help="capture dir (default local/captures/<name>/projector)")
    ap.add_argument("--sound", action="store_true", help="keep audio devices enabled (less deterministic)")
    ap.add_argument("--timeout", type=float, default=60.0, help="abort if no new tick for this many seconds")
    ap.add_argument("--verbose", action="store_true", help="print every tick")
    ap.add_argument("--diag-from", type=int, help="append a per-state/clock-read trace from this tick on to "
                    "<out>/agent_diag.txt (debugging)")
    ap.add_argument("--blit-trace", help="FROM:TO - log every Iml32 blit (rects, mode, clip) of ticks FROM..TO to "
                    "<out>/agent_diag.txt (renderer RE)")
    ap.add_argument("--region-trace", help="FROM:TO - log Director's stage update region (the rect list flushed by "
                    "Dirapi FUN_68060660) of ticks FROM..TO to <out>/agent_diag.txt as 'REGION t=N dirty=D n:[l,t,r,b]...'")
    ap.add_argument("--no-frames", action="store_true", help="do not write the PNG frames (traces/sprites only)")
    ap.add_argument("--wait-other", type=float, default=120.0,
                    help="wait this long for other Projector.exe processes to exit before refusing")
    ap.add_argument("--sprites", action="store_true",
                    help="also write sprites.json: Director's sprite channel state after every tick, in the "
                    "same format as the port's `run_port.mjs --sprites --batch 1`")
    args = ap.parse_args()

    with open(args.script, encoding="utf-8") as f:
        script = json.load(f)
    name = script.get("name") or os.path.splitext(os.path.basename(args.script))[0]
    ticks = args.ticks or int(script["ticks"])
    seed = script.get("seed")
    events = []
    for i, e in enumerate(script.get("events", [])):
        e = dict(e)
        if e["type"] == "key":
            if e["key"] not in KEY_MAC:
                sys.exit("key %r (event %d) has no Mac key code mapping" % (e["key"], i))
            e["mac"] = KEY_MAC[e["key"]]
            e["vk"] = KEY_VK.get(e["key"], 0)
        elif e["type"] not in ("move", "down", "up"):
            sys.exit("unknown event type %r in event %d" % (e["type"], i))
        if e["tick"] <= ticks:
            events.append(e)

    out = pick_out_dir(os.path.abspath(args.out or os.path.join(LOCAL, "captures", name, "projector")), ticks)
    frames_dir = os.path.join(out, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    wait_for_other_projectors(args.wait_other)

    tick_meta = []
    sprite_dump = {}
    member_names = load_member_names() if args.sprites else {}
    logs = []
    writeq = queue.Queue(maxsize=64)
    finished = threading.Event()
    failure = []
    last_progress = [time.time()]

    def writer():
        while True:
            item = writeq.get()
            if item is None:
                return
            meta, data = item
            if args.no_frames:
                continue
            try:
                to_image(meta, data).save(os.path.join(frames_dir, "%06d.png" % meta["tick"]), compress_level=1)
            except Exception as ex:  # noqa: BLE001
                failure.append("png write failed at tick %d: %s" % (meta["tick"], ex))
                finished.set()

    writers = [threading.Thread(target=writer, daemon=True) for _ in range(4)]
    for t in writers:
        t.start()

    dev = frida.get_local_device()
    pid = None
    session = None
    hide_done = threading.Event()
    job = JobKiller()
    t_start = time.time()
    try:
        pid = dev.spawn([PROJECTOR], cwd=GAME_DIR)
        job.add(pid)
        session = dev.attach(pid)
        with open(os.path.join(HERE, "agent.js"), encoding="utf-8") as f:
            sc = session.create_script(f.read())

        def on_message(msg, data):
            if msg["type"] == "error":
                failure.append("agent error: %s\n%s" % (msg.get("description"), msg.get("stack")))
                finished.set()
                return
            p = msg["payload"]
            t = p.get("type")
            if t == "frame":
                last_progress[0] = time.time()
                if p.get("missing"):
                    failure.append("tick %d: 600x400x32 stage buffer not available (%s)" % (p["tick"], p.get("stage")))
                    finished.set()
                else:
                    entry = {"tick": p["tick"], "frame": p.get("frame"), "ms": p["ms"], "clock": p.get("clock"),
                             "rngState": p.get("rngState")}
                    if p.get("renders") != 1:
                        entry["renders"] = p.get("renders")      # stage renders this tick (normally 1)
                    if p.get("passes") != 1:
                        entry["keyPasses"] = p.get("passes")     # busy-wait key-poll passes (normally 1)
                    tick_meta.append(entry)
                    if args.sprites:
                        rows = p.get("sprites")
                        sprite_dump[p["tick"]] = None if rows is None else sprite_rows_to_port(rows, member_names)
                    if data is not None:
                        writeq.put((p, data))
                sc.post({"type": "ack"})
                if p["tick"] % 100 == 0 or args.verbose:
                    print("  tick %d (%.1fs)" % (p["tick"], time.time() - t_start), flush=True)
            elif t == "done":
                finished.set()
            elif t == "log":
                logs.append(p["msg"])
                print("  [agent] " + p["msg"], flush=True)

        def on_detached(reason, crash):
            if not finished.is_set():
                failure.append("projector detached: %s %s" % (reason, crash.report if crash else ""))
                finished.set()

        session.on("detached", on_detached)
        sc.on("message", on_message)
        sc.load()
        sc.exports_sync.init({"events": events, "ticks": ticks, "seed": seed, "sound": args.sound,
                              "gameDir": GAME_DIR, "gameModules": game_module_names(),
                              "diagFile": os.path.join(out, "agent_diag.txt") if (args.diag_from or args.blit_trace or args.region_trace) else None,
                              "diagFrom": args.diag_from or 0, "sprites": args.sprites,
                              "blitTrace": [int(v) for v in args.blit_trace.split(":")] if args.blit_trace else None,
                              "regionTrace": [int(v) for v in args.region_trace.split(":")] if args.region_trace else None})
        if not args.show:
            threading.Thread(target=hide_windows, args=(pid, hide_done), daemon=True).start()
        dev.resume(pid)
        print("Projector.exe pid %d running %r for %d ticks (seed %s)" % (pid, name, ticks, seed), flush=True)

        while not finished.wait(0.25):
            if time.time() - last_progress[0] > args.timeout:
                # (no RPC here: the agent's JS thread may be blocked by the stuck main thread)
                wins = [(cls, title, child_texts(h) if cls == "#32770" else "")
                        for h, cls, vis, title in find_windows(pid, titles=True) if vis]
                failure.append("timeout: no new tick for %.0fs after tick %d (windows %s)"
                               % (args.timeout, max([e["tick"] for e in tick_meta] or [0]), wins))
                break
    except KeyboardInterrupt:
        failure.append("interrupted")
    finally:
        hide_done.set()
        if pid is not None:
            try:
                dev.kill(pid)
            except Exception:  # noqa: BLE001
                pass
        for _ in writers:
            writeq.put(None)
        for t in writers:
            t.join()

    tick_meta.sort(key=lambda e: e["tick"])
    with open(os.path.join(out, "frames.json"), "w", encoding="utf-8") as f:
        json.dump({"side": "projector", "scenario": name, "seed": seed, "ticks": tick_meta,
                   "complete": not failure and len(tick_meta) == ticks, "log": logs}, f, indent=1)
    if args.sprites:
        # same layout as scripts/run_port.mjs: {"<tick>": [sprite, ...], ...}, one tick per line
        body = ",\n".join("%s:%s" % (json.dumps(str(t)), json.dumps(sprite_dump[t], separators=(",", ":")))
                          for t in sorted(sprite_dump))
        with open(os.path.join(out, "sprites.json"), "w", encoding="utf-8") as f:
            f.write("{" + body + "}")
    if failure:
        print("FAILED: " + "\n".join(failure), file=sys.stderr)
        sys.exit(1)
    print("captured %d ticks in %.1fs -> %s" % (len(tick_meta), time.time() - t_start, out))


if __name__ == "__main__":
    main()
