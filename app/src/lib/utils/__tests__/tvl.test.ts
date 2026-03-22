import { describe, expect, it } from "vitest";
import { calculatePoolTvl, formatTvlCompact, formatTvlDisplay } from "../tvl";

describe("calculatePoolTvl", () => {
  it("returns correct TVL: 1000000 shares * 1.05 nav / 1e6 = 1.05", () => {
    expect(calculatePoolTvl(1000000, 1.05)).toBeCloseTo(1.05, 6);
  });

  it("returns null when totalShares is null", () => {
    expect(calculatePoolTvl(null, 1.05)).toBeNull();
  });

  it("returns null when pricePerShare is null", () => {
    expect(calculatePoolTvl(1000000, null)).toBeNull();
  });

  it("returns null when totalShares is 0", () => {
    expect(calculatePoolTvl(0, 1.05)).toBeNull();
  });

  it("returns null when pricePerShare is 0", () => {
    expect(calculatePoolTvl(1000000, 0)).toBeNull();
  });

  it("handles string inputs (converts to number)", () => {
    expect(calculatePoolTvl("2000000", "1.50")).toBeCloseTo(3.0, 6);
  });
});

describe("formatTvlDisplay", () => {
  it("formats with 2 decimal places and USDC suffix", () => {
    const result = formatTvlDisplay(1234.5);
    expect(result).toMatch(/1[,.]?234\.50 USDC$/);
  });

  it('returns "0.00 USDC" for null input', () => {
    expect(formatTvlDisplay(null)).toBe("0.00 USDC");
  });
});

describe("formatTvlCompact", () => {
  it('returns "X.XXM USDC" for millions', () => {
    expect(formatTvlCompact(2500000)).toBe("2.50M USDC");
  });

  it('returns "X.XK USDC" for thousands', () => {
    expect(formatTvlCompact(45000)).toBe("45.0K USDC");
  });

  it('returns "\u2014" (em dash) for null input', () => {
    expect(formatTvlCompact(null)).toBe("\u2014");
  });
});
