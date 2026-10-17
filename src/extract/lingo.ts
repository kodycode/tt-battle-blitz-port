// Lingo literal parser for behaviour initializers (property lists such as
// `[#soundName: #SFX_X, #volumeLevel: 100]`) -> JSON values. See docs/DATA_FORMAT.md "Behavior".
import { decodeText } from './bytes';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** C printf("%.6g") round trip: the data files print doubles with 6 significant digits. */
export function g6(x: number): number {
  return Number(x.toPrecision(6));
}

const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\v' || c === '\f';
const isDigit = (c: string) => c >= '0' && c <= '9';
const isIdent = (c: string) => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';

class Parser {
  i = 0;
  ok = true;
  constructor(readonly s: string) {}
  ws() {
    while (this.i < this.s.length && isSpace(this.s[this.i])) this.i++;
  }
  eat(c: string): boolean {
    this.ws();
    if (this.s[this.i] === c) {
      this.i++;
      return true;
    }
    return false;
  }
  ident(): string {
    const b = this.i;
    while (this.i < this.s.length && isIdent(this.s[this.i])) this.i++;
    return this.s.slice(b, this.i);
  }
  /** Returns the value and the key spelling used when the value is a property-list key. */
  value(): { v: Json; key: string } {
    this.ws();
    const s = this.s;
    if (this.i >= s.length) {
      this.ok = false;
      return { v: null, key: '' };
    }
    const c = s[this.i];
    if (c === '[') return { v: this.list(), key: '' };
    if (c === '"') {
      this.i++;
      const b = this.i;
      while (this.i < s.length && s[this.i] !== '"') this.i++;
      const str = s.slice(b, this.i);
      if (this.i < s.length) this.i++;
      else this.ok = false;
      return { v: str, key: str };
    }
    if (c === '#') {
      this.i++;
      const id = this.ident();
      return { v: '#' + id, key: id };
    }
    if (isDigit(c) || c === '-' || c === '.' || c === '+') {
      const b = this.i++;
      while (this.i < s.length && (isDigit(s[this.i]) || s[this.i] === '.' || s[this.i] === 'e' || s[this.i] === 'E')) this.i++;
      const num = s.slice(b, this.i);
      const v = /[.eE]/.test(num) ? g6(parseFloat(num)) : parseInt(num, 10);
      if (Number.isNaN(v)) this.ok = false;
      return { v, key: num };
    }
    if (isIdent(c)) {
      const b = this.i;
      const id = this.ident();
      this.ws();
      if (s[this.i] === '(') {
        // point(...), rect(...), rgb(...): kept as source text
        let depth = 0;
        for (; this.i < s.length; this.i++) {
          if (s[this.i] === '(') depth++;
          else if (s[this.i] === ')' && --depth === 0) {
            this.i++;
            break;
          }
        }
        const raw = s.slice(b, this.i);
        return { v: raw, key: raw };
      }
      const up = id.toUpperCase();
      if (up === 'TRUE') return { v: 1, key: id };
      if (up === 'FALSE') return { v: 0, key: id };
      if (up === 'VOID') return { v: null, key: id };
      if (up === 'EMPTY') return { v: '', key: id };
      return { v: id, key: id };
    }
    this.ok = false;
    return { v: null, key: '' };
  }
  list(): Json {
    this.i++; // '['
    if (this.eat(':')) {
      this.eat(']');
      return {};
    }
    if (this.eat(']')) return [];
    const items: Json[] = [];
    const props: { [k: string]: Json } = {};
    let isProp = false;
    let first = true;
    while (this.ok) {
      const { v, key } = this.value();
      if (this.eat(':')) {
        if (!first && !isProp) {
          this.ok = false;
          break;
        }
        isProp = true;
        props[key] = this.value().v;
      } else {
        if (isProp) {
          this.ok = false;
          break;
        }
        items.push(v);
      }
      first = false;
      if (this.eat(',')) continue;
      if (this.eat(']')) break;
      this.ok = false;
    }
    return isProp ? props : items;
  }
}

export function parseLingoLiteral(text: string): { ok: boolean; value: Json } {
  const p = new Parser(text);
  const v = p.value().v;
  p.ws();
  const ok = p.ok && p.i === text.length;
  return { ok, value: ok ? v : null };
}

/** Initializer bytes -> trimmed text (trailing NULs and whitespace removed, UTF-8 or Windows-1252). */
export function initializerText(d: Uint8Array): string {
  let end = d.length;
  while (end > 0 && (d[end - 1] === 0 || d[end - 1] === 0x20 || (d[end - 1] >= 0x09 && d[end - 1] <= 0x0d))) end--;
  return decodeText(d.subarray(0, end));
}
