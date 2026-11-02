import { describe, expect, it } from "vitest";
import { snapTextScale, TEXT_SCALES } from "../src/ui/text-scale";

describe("text scale options", () => {
  it("uses integer-friendly UI scales", () => {
    expect(TEXT_SCALES).toEqual([1, 1.25, 1.5, 2]);
  });

  it("snaps a saved fractional scale to the nearest option", () => {
    expect(snapTextScale(0.9)).toBe(1);
    expect(snapTextScale(1.1)).toBe(1);
    expect(snapTextScale(1.3)).toBe(1.25);
    expect(snapTextScale(1.45)).toBe(1.5);
    expect(snapTextScale(1.9)).toBe(2);
  });

  it("falls back to 100% for non-finite input", () => {
    expect(snapTextScale(Number.NaN)).toBe(1);
    expect(snapTextScale(Number.POSITIVE_INFINITY)).toBe(1);
  });
});
