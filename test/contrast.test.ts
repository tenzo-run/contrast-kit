import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parse, toHex, rgbToHsl, hslToRgb,
  wcagRatio, wcagLevel, apcaContrast, check, bestTextColor,
} from "../src/index.ts";

const near = (a: number, b: number, eps = 0.05) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);

test("parse: hex short / long / alpha", () => {
  assert.deepEqual(parse("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parse("#1a2B3c"), { r: 26, g: 43, b: 60, a: 1 });
  assert.equal(parse("#00000080").a, 0.502);
});

test("parse: rgb / hsl, comma and space syntax", () => {
  assert.deepEqual(parse("rgb(10, 20, 30)"), { r: 10, g: 20, b: 30, a: 1 });
  assert.deepEqual(parse("rgb(10 20 30 / 50%)"), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.deepEqual(parse("hsl(0, 100%, 50%)"), { r: 255, g: 0, b: 0, a: 1 });
});

test("parse: rejects garbage", () => {
  assert.throws(() => parse("#12"), TypeError);
  assert.throws(() => parse("banana"), TypeError);
  assert.throws(() => parse("rgb(1,2)"), TypeError);
});

test("hex ⇄ hsl round-trip", () => {
  for (const hex of ["#e8967a", "#0d1117", "#34a853", "#777777"]) {
    assert.equal(toHex(hslToRgb(rgbToHsl(parse(hex)))), hex);
  }
});

test("WCAG: known ratios", () => {
  near(wcagRatio("#000", "#fff"), 21, 0.001);
  near(wcagRatio("#fff", "#fff"), 1, 0.001);
  near(wcagRatio("#777", "#fff"), 4.48, 0.01);
  assert.equal(wcagLevel(4.48), "AA Large");
  assert.equal(wcagLevel(4.5), "AA");
});

test("WCAG: symmetric", () => {
  near(wcagRatio("#e8967a", "#0d1117"), wcagRatio("#0d1117", "#e8967a"), 1e-9);
});

test("APCA: reference values", () => {
  near(apcaContrast("#000", "#fff"), 106.04, 0.05);
  near(apcaContrast("#fff", "#000"), -107.88, 0.05);
  near(apcaContrast("#888", "#fff"), 63.06, 0.1);
  near(apcaContrast("#fff", "#888"), -68.54, 0.1);
});

test("APCA: identical colors → 0", () => {
  assert.equal(apcaContrast("#abcdef", "#abcdef"), 0);
});

test("translucent text is composited", () => {
  const solid = wcagRatio("#000", "#fff");
  const faded = wcagRatio("rgba(0,0,0,0.5)", "#fff");
  assert.ok(faded < solid);
  near(faded, wcagRatio("#808080", "#fff"), 0.05);
});

test("check + bestTextColor", () => {
  const r = check("#000", "#fff");
  assert.equal(r.wcag.level, "AAA");
  assert.equal(r.apca.useCase, "Preferred for body text");
  assert.equal(bestTextColor("#0d1117"), "#ffffff");
  assert.equal(bestTextColor("#ffd54f"), "#000000");
});
