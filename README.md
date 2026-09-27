<div align="center">

# 🎨 contrast-kit

**Zero-dependency WCAG 2.x + APCA contrast checker and CSS color toolkit for TypeScript.**

![CI](https://github.com/tenzo-run/contrast-kit/actions/workflows/ci.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![deps](https://img.shields.io/badge/dependencies-0-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

The contrast engine behind the ideas in [PickShade](https://pickshade.com) — extracted as a tiny library.

</div>

## Why

WCAG 2.x contrast ratios are the legal baseline, but they are known to misjudge
dark themes. **APCA** (the candidate method for WCAG 3) is perceptually uniform and
polarity-aware. Real products need both — so `contrast-kit` gives you both in one call.

```ts
check("#e8967a", "#0d1117");
// {
//   wcag: { ratio: 8.18, level: "AAA" },
//   apca: { lc: -56.2, useCase: "Large headlines, 36px+ or 24px bold" }
// }
```

> WCAG says **AAA**. APCA says *only use it for large headlines*.
> That gap is exactly why you want both numbers on dark UIs.

## Features

- ✅ **WCAG 2.x** relative luminance, contrast ratio and AA / AAA level
- ✅ **APCA 0.0.98G-4g** Lc value + plain-English use-case guidance
- ✅ Translucent text is **alpha-composited** before measuring (like the browser renders it)
- ✅ CSS parser: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()` — comma *and* modern space syntax
- ✅ HEX ⇄ RGB ⇄ HSL conversions
- ✅ `bestTextColor()` — auto-pick black/white (or any palette) for a background
- ✅ Strict TypeScript, ESM, zero dependencies, ~3 KB

## Usage

```ts
import { wcagRatio, apcaContrast, bestTextColor, parse, rgbToHsl } from "contrast-kit";

wcagRatio("#777", "#fff");            // 4.48  → fails AA by a hair
apcaContrast("#000", "#fff");         // 106.04
apcaContrast("#fff", "#000");         // -107.88 (light-on-dark is negative)
wcagRatio("rgba(0,0,0,.5)", "#fff");  // composited → same as #808080

bestTextColor("#ffd54f");                          // "#000000"
bestTextColor("#0d1117", ["#e8967a", "#c9d1d9"]);  // strongest candidate

rgbToHsl(parse("rgb(232 150 122 / 80%)"));
// { h: 15.3, s: 70.5, l: 69.4, a: 0.8 }
```

## API

| Function | Returns |
| --- | --- |
| `parse(css)` | `RGB` |
| `toHex(rgb)` / `rgbToHsl(rgb)` / `hslToRgb(hsl)` | conversions |
| `blend(fg, bg)` | alpha-composited `RGB` |
| `luminance(color)` | WCAG relative luminance `0–1` |
| `wcagRatio(text, bg)` | `1–21` |
| `wcagLevel(ratio)` | `"AAA" \| "AA" \| "AA Large" \| "Fail"` |
| `apcaContrast(text, bg)` | Lc `≈ -108…106` |
| `apcaUseCase(lc)` | guidance string |
| `check(text, bg)` | both metrics, rounded |
| `bestTextColor(bg, candidates?)` | best candidate |

Every function accepts a CSS string **or** an `{ r, g, b, a? }` object.

## Development

```bash
npm install
npm test        # node:test, runs TypeScript natively (Node 22.6+)
npm run build   # → dist/ with .d.ts
```

Tests pin APCA against the reference values (`#000/#fff → 106.04`, `#fff/#000 → -107.88`, `#888/#fff → 63.06`).

## License

MIT © [Sanzhar Abdurakhmanov](https://github.com/tenzo-run)

APCA is © Myndex / Andrew Somers; this is an independent implementation of the published
0.0.98G-4g constants for evaluation purposes.
