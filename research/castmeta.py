"""Bitmap member metadata (size, reg point, depth, palette) from ProjectorRays --dump-chunks output.

Usage: python -I research/castmeta.py <dump dir containing */chunks> <out.tsv>
Reads CASt-*.bin only; never executes anything from the game files.

CASt layout: u32 type, u32 infoLen, u32 specificLen, info[infoLen], specific[specificLen].
Bitmap (type 1) specific data, D7/D8:
  u16 pitch (bit 15 = depth/palette fields follow), rect top,left,bottom,right (i16),
  8 bytes unused here, i16 regY, i16 regX, u8 flags,
  [u8 bitsPerPixel, i16 clutCastLib, i16 clutId]   (only when pitch bit 15 is set; else 1-bit)
"""
import glob
import os
import struct
import sys


def member_name(info):
    # Info is a list of offsets followed by strings; ProjectorRays' JSON shows the name is the
    # Pascal string at offset table entry 1. Parse defensively: dataOffset u32, then 5 u32s,
    # then u16 count, count+1 u32 offsets, then items.
    try:
        data_off = struct.unpack('>I', info[0:4])[0]
        count = struct.unpack('>H', info[data_off:data_off + 2])[0]
        offs = struct.unpack('>%dI' % (count + 1), info[data_off + 2:data_off + 2 + 4 * (count + 1)])
        base = data_off + 2 + 4 * (count + 1)
        if count >= 2:
            item = info[base + offs[1]:base + offs[2]]
            if item:
                return item[1:1 + item[0]].decode('latin-1')
    except struct.error:
        pass
    return ''


def main(dump_dir, out_path):
    rows = []
    for chunk_dir in sorted(glob.glob(os.path.join(dump_dir, '*', 'chunks'))):
        cast = os.path.basename(os.path.dirname(chunk_dir))
        for p in glob.glob(os.path.join(chunk_dir, 'CASt-*.bin')):
            b = open(p, 'rb').read()
            typ, il, sl = struct.unpack('>III', b[:12])
            if typ != 1:
                continue
            info = b[12:12 + il]
            s = b[12 + il:12 + il + sl]
            pitch = struct.unpack('>H', s[0:2])[0]
            top, left, bottom, right = struct.unpack('>4h', s[2:10])
            reg_y, reg_x = struct.unpack('>2h', s[18:22])
            bpp, clut_lib, clut_id = 1, 0, 0
            if pitch & 0x8000 and len(s) >= 28:
                bpp = s[23]
                clut_lib, clut_id = struct.unpack('>2h', s[24:28])
            chunk_id = int(os.path.basename(p)[5:-4])
            rows.append((cast, chunk_id, member_name(info), right - left, bottom - top,
                         reg_x - left, reg_y - top, bpp, clut_lib, clut_id))
    rows.sort()
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('cast\tchunk\tname\tw\th\tregX\tregY\tbpp\tclutLib\tclutId\n')
        for r in rows:
            f.write('\t'.join(map(str, r)) + '\n')
    print(len(rows), 'bitmaps ->', out_path)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
