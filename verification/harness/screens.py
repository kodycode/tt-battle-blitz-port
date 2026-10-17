"""Inspect a capture: list ticks where the picture changes a lot (screen changes) and/or make a contact
sheet of selected ticks, plus compare two capture folders for byte/pixel identity.

    python verification/harness/screens.py changes <capture_dir> [--thr 0.3]
    python verification/harness/screens.py sheet <capture_dir> <out.png> <tick> [<tick> ...]
    python verification/harness/screens.py compare <capture_dir_a> <capture_dir_b>

<capture_dir> is e.g. local/captures/menu_walkthrough/projector (containing frames/ and frames.json).
"""
import hashlib
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw


def frames(d):
    fd = os.path.join(d, "frames")
    return sorted(int(f[:-4]) for f in os.listdir(fd) if f.endswith(".png") and f[:-4].isdigit())


def load(d, t):
    return np.asarray(Image.open(os.path.join(d, "frames", "%06d.png" % t)).convert("RGB"), dtype=np.int16)


def changes(d, thr):
    meta = {}
    mj = os.path.join(d, "frames.json")
    if os.path.exists(mj):
        meta = {e["tick"]: e for e in json.load(open(mj))["ticks"]}
    prev = None
    for t in frames(d):
        a = load(d, t)
        if prev is not None:
            frac = float((np.abs(a - prev).max(axis=2) > 24).mean())
            if frac >= thr:
                print("tick %5d  frame %-5s changed %.0f%%" % (t, meta.get(t, {}).get("frame"), frac * 100))
        prev = a


def sheet(d, out, ticks):
    cols = 4
    rows = (len(ticks) + cols - 1) // cols
    im = Image.new("RGB", (cols * 300, rows * 216), "white")
    dr = ImageDraw.Draw(im)
    for i, t in enumerate(ticks):
        x, y = (i % cols) * 300, (i // cols) * 216
        im.paste(Image.open(os.path.join(d, "frames", "%06d.png" % t)).convert("RGB").resize((300, 200)), (x, y + 16))
        dr.text((x + 3, y + 2), "tick %d" % t, fill="black")
    im.save(out)


def compare(a, b):
    ta, tb = frames(a), frames(b)
    if ta != tb:
        print("tick sets differ: %d vs %d frames" % (len(ta), len(tb)))
    same_bytes = same_pixels = 0
    first_diff = None
    for t in sorted(set(ta) & set(tb)):
        fa = os.path.join(a, "frames", "%06d.png" % t)
        fb = os.path.join(b, "frames", "%06d.png" % t)
        if hashlib.sha256(open(fa, "rb").read()).digest() == hashlib.sha256(open(fb, "rb").read()).digest():
            same_bytes += 1
            same_pixels += 1
            continue
        if np.array_equal(load(a, t), load(b, t)):
            same_pixels += 1
        elif first_diff is None:
            first_diff = t
    n = len(set(ta) & set(tb))
    print("%d common ticks: %d byte-identical PNGs, %d pixel-identical; first differing tick: %s"
          % (n, same_bytes, same_pixels, first_diff))
    ja, jb = os.path.join(a, "frames.json"), os.path.join(b, "frames.json")
    if os.path.exists(ja) and os.path.exists(jb):
        ma = [(e["tick"], e["frame"], e["ms"], e.get("rngState")) for e in json.load(open(ja))["ticks"]]
        mb = [(e["tick"], e["frame"], e["ms"], e.get("rngState")) for e in json.load(open(jb))["ticks"]]
        print("frames.json tick/frame/ms/rngState sequences identical: %s" % (ma == mb))
    return first_diff is None and ta == tb


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    cmd = sys.argv[1]
    if cmd == "changes":
        thr = float(sys.argv[sys.argv.index("--thr") + 1]) if "--thr" in sys.argv else 0.3
        changes(sys.argv[2], thr)
    elif cmd == "sheet":
        sheet(sys.argv[2], sys.argv[3], [int(x) for x in sys.argv[4:]])
    elif cmd == "compare":
        sys.exit(0 if compare(sys.argv[2], sys.argv[3]) else 1)
    else:
        sys.exit(__doc__)
