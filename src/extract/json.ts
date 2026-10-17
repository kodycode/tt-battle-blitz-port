// JSON text in the layout of the original data files: objects/arrays are pretty-printed (one-space indent)
// down to `prettyDepth`, deeper values are written on one line. casts.json uses depth 4 (one member per
// line), score.json depth 2 (one sprite span per line). JSON.parse of the result equals the input.
export function stringifyData(value: unknown, prettyDepth: number): string {
  const out: string[] = [];
  const write = (v: unknown, depth: number) => {
    if (depth >= prettyDepth || v === null || typeof v !== 'object') {
      out.push(JSON.stringify(v) ?? 'null');
      return;
    }
    const nl = '\n' + ' '.repeat(depth + 1);
    if (Array.isArray(v)) {
      out.push('[');
      v.forEach((x, i) => {
        if (i) out.push(',');
        out.push(nl);
        write(x, depth + 1);
      });
      if (v.length) out.push('\n' + ' '.repeat(depth));
      out.push(']');
      return;
    }
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
    out.push('{');
    entries.forEach(([k, x], i) => {
      if (i) out.push(',');
      out.push(nl, JSON.stringify(k), ':');
      write(x, depth + 1);
    });
    if (entries.length) out.push('\n' + ' '.repeat(depth));
    out.push('}');
  };
  write(value, 0);
  return out.join('');
}
