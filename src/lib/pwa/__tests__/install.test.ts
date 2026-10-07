import { describe, expect, it } from "vitest";
import { computeShowDelay, detectPlatform } from "../install";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15";

describe("detectPlatform", () => {
  it("detects iOS, Android, iPadOS and desktop", () => {
    expect(detectPlatform(IPHONE, 5)).toBe("ios");
    expect(detectPlatform(ANDROID, 5)).toBe("android");
    expect(detectPlatform(MAC, 5)).toBe("ios"); // iPadOS desktop-class UA
    expect(detectPlatform(MAC, 0)).toBe("desktop");
  });
});

describe("computeShowDelay", () => {
  it("waits 10 s from mount when the user never interacts", () => {
    expect(computeShowDelay(1_000, null, 1_000)).toBe(10_000);
    expect(computeShowDelay(1_000, null, 8_000)).toBe(3_000);
  });
  it("shows 5 s after the first interaction", () => {
    expect(computeShowDelay(0, 2_000, 2_000)).toBe(5_000);
  });
  it("never later than 10 s after mount, even for a late interaction", () => {
    expect(computeShowDelay(0, 8_000, 8_000)).toBe(2_000);
    expect(computeShowDelay(0, 9_500, 12_000)).toBe(0);
  });
});
