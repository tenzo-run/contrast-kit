/** An sRGB color with 0–255 channels and 0–1 alpha. */
export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface HSL {
  h: number; // 0–360
  s: number; // 0–100
  l: number; // 0–100
  a?: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, p = 0) => {
  const f = 10 ** p;
  return Math.round(v * f) / f;
};

/**
 * Parse a CSS color string: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`,
 * `rgb()/rgba()` and `hsl()/hsla()` in both comma and space syntax.
 * Throws a `TypeError` on invalid input.
 */
export function parse(input: string): RGB {
  const s = input.trim().toLowerCase();

  if (s.startsWith("#")) return parseHex(s);

  const fn = /^(rgba?|hsla?)\(\s*(.+)\s*\)$/.exec(s);
  if (!fn) throw new TypeError(`Unsupported color: "${input}"`);

  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) throw new TypeError(`Invalid color: "${input}"`);

  const alpha = parts[3] !== undefined ? parseAlpha(parts[3]) : 1;

  if (fn[1].startsWith("rgb")) {
    const [r, g, b] = parts.slice(0, 3).map((p) =>
      p.endsWith("%") ? (parseFloat(p) / 100) * 255 : parseFloat(p),
    );
    assertNumbers(input, r, g, b);
    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: alpha };
  }

  const h = parseFloat(parts[0]);
  const sat = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);
  assertNumbers(input, h, sat, l);
  return { ...hslToRgb({ h, s: sat, l }), a: alpha };
}

function parseHex(s: string): RGB {
  let hex = s.slice(1);
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(hex)) {
    throw new TypeError(`Invalid hex color: "${s}"`);
  }
  if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? round(n(6) / 255, 3) : 1 };
}

function parseAlpha(p: string): number {
  const v = p.endsWith("%") ? parseFloat(p) / 100 : parseFloat(p);
  if (Number.isNaN(v)) throw new TypeError(`Invalid alpha: "${p}"`);
  return clamp(v, 0, 1);
}

function assertNumbers(input: string, ...vals: number[]) {
  if (vals.some(Number.isNaN)) throw new TypeError(`Invalid color: "${input}"`);
}

export function toHex({ r, g, b, a = 1 }: RGB): string {
  const h = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}${a < 1 ? h(a * 255) : ""}`;
}

export function rgbToHsl({ r, g, b, a = 1 }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: round(h, 1), s: round(s * 100, 1), l: round(l * 100, 1), a };
}

export function hslToRgb({ h, s, l, a = 1 }: HSL): RGB {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  const [r1, g1, b1] =
    hn < 60 ? [c, x, 0] :
    hn < 120 ? [x, c, 0] :
    hn < 180 ? [0, c, x] :
    hn < 240 ? [0, x, c] :
    hn < 300 ? [x, 0, c] : [c, 0, x];
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
    a,
  };
}

/** Alpha-composite a (possibly translucent) foreground over an opaque background. */
export function blend(fg: RGB, bg: RGB): RGB {
  const a = fg.a ?? 1;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

export type ColorInput = string | RGB;
export const toRgb = (c: ColorInput): RGB => (typeof c === "string" ? parse(c) : c);
