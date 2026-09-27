import { blend, toRgb, type ColorInput, type RGB } from "./color.ts";

// ─── WCAG 2.x ────────────────────────────────────────────────────────────────

const linearize = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.x relative luminance (0–1). */
export function luminance(color: ColorInput): number {
  const { r, g, b } = toRgb(color);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG 2.x contrast ratio (1–21). Translucent text is composited
 * over the background first, as a browser would render it.
 */
export function wcagRatio(text: ColorInput, background: ColorInput): number {
  const bg = toRgb(background);
  const fg = blend(toRgb(text), bg);
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

// ─── APCA (0.0.98G-4g, the constants used in WCAG 3 drafts) ─────────────────

const APCA = {
  mainTRC: 2.4,
  sRco: 0.2126729,
  sGco: 0.7151522,
  sBco: 0.072175,
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1,
} as const;

function apcaY({ r, g, b }: RGB): number {
  const c = (v: number) => (v / 255) ** APCA.mainTRC;
  return APCA.sRco * c(r) + APCA.sGco * c(g) + APCA.sBco * c(b);
}

const softClamp = (y: number) =>
  y > APCA.blkThrs ? y : y + (APCA.blkThrs - y) ** APCA.blkClmp;

/**
 * APCA lightness contrast Lc (≈ -108 … 106).
 * Positive = dark text on light background, negative = light on dark.
 * Order matters: APCA is intentionally polarity-aware.
 */
export function apcaContrast(text: ColorInput, background: ColorInput): number {
  const bgRgb = toRgb(background);
  const txtY = softClamp(apcaY(blend(toRgb(text), bgRgb)));
  const bgY = softClamp(apcaY(bgRgb));

  if (Math.abs(bgY - txtY) < APCA.deltaYmin) return 0;

  let out: number;
  if (bgY > txtY) {
    const sapc = (bgY ** APCA.normBG - txtY ** APCA.normTXT) * APCA.scaleBoW;
    out = sapc < APCA.loClip ? 0 : sapc - APCA.loBoWoffset;
  } else {
    const sapc = (bgY ** APCA.revBG - txtY ** APCA.revTXT) * APCA.scaleWoB;
    out = sapc > -APCA.loClip ? 0 : sapc + APCA.loWoBoffset;
  }
  return out * 100;
}

/**
 * Simplified APCA use-case guidance (Bronze level) for a given |Lc|.
 * See https://readtech.org/ARC/ for the full font-size/weight lookup table.
 */
export function apcaUseCase(lc: number): string {
  const v = Math.abs(lc);
  if (v >= 90) return "Preferred for body text";
  if (v >= 75) return "Minimum for body text";
  if (v >= 60) return "Content text (non-body), 24px+ or 16px bold";
  if (v >= 45) return "Large headlines, 36px+ or 24px bold";
  if (v >= 30) return "Placeholder / disabled text, non-text UI";
  if (v >= 15) return "Non-text decorative elements only";
  return "Invisible — do not use";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export interface ContrastReport {
  wcag: { ratio: number; level: WcagLevel };
  apca: { lc: number; useCase: string };
}

/** One call → both metrics, rounded for display. */
export function check(text: ColorInput, background: ColorInput): ContrastReport {
  const ratio = wcagRatio(text, background);
  const lc = apcaContrast(text, background);
  return {
    wcag: { ratio: Math.round(ratio * 100) / 100, level: wcagLevel(ratio) },
    apca: { lc: Math.round(lc * 10) / 10, useCase: apcaUseCase(lc) },
  };
}

/** Pick whichever candidate has the strongest APCA contrast against `background`. */
export function bestTextColor(
  background: ColorInput,
  candidates: ColorInput[] = ["#000000", "#ffffff"],
): ColorInput {
  let best = candidates[0];
  let bestLc = -1;
  for (const c of candidates) {
    const lc = Math.abs(apcaContrast(c, background));
    if (lc > bestLc) {
      best = c;
      bestLc = lc;
    }
  }
  return best;
}
