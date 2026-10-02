import { describe, expect, it } from "vitest";

function detectPlatform(platform: string, userAgent: string) {
  const isMac = /(Mac|iPhone|iPod|iPad)/i.test(platform || userAgent || "");
  const isMobile =
    /(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini)/i.test(userAgent || "");
  return {
    label: isMac ? "⌘K" : "Ctrl K",
    modifier: isMac ? "⌘" : "Ctrl",
    key: "K",
    isMac,
    isMobile,
  };
}

describe("Universal Platform Shortcut Detection", () => {
  it("detects Mac desktop and provides ⌘K", () => {
    const res = detectPlatform("MacIntel", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(res.isMac).toBe(true);
    expect(res.label).toBe("⌘K");
    expect(res.modifier).toBe("⌘");
    expect(res.isMobile).toBe(false);
  });

  it("detects Windows 10/11 and provides Ctrl K", () => {
    const res = detectPlatform("Win32", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(res.isMac).toBe(false);
    expect(res.label).toBe("Ctrl K");
    expect(res.modifier).toBe("Ctrl");
    expect(res.isMobile).toBe(false);
  });

  it("detects Linux and provides Ctrl K", () => {
    const res = detectPlatform("Linux x86_64", "Mozilla/5.0 (X11; Linux x86_64)");
    expect(res.isMac).toBe(false);
    expect(res.label).toBe("Ctrl K");
    expect(res.modifier).toBe("Ctrl");
    expect(res.isMobile).toBe(false);
  });

  it("detects iPhone/iOS as Mac family mobile device", () => {
    const res = detectPlatform("iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(res.isMac).toBe(true);
    expect(res.label).toBe("⌘K");
    expect(res.isMobile).toBe(true);
  });

  it("detects Android as mobile device with Ctrl K fallback", () => {
    const res = detectPlatform("Linux armv8l", "Mozilla/5.0 (Linux; Android 14; Pixel 8)");
    expect(res.isMac).toBe(false);
    expect(res.label).toBe("Ctrl K");
    expect(res.isMobile).toBe(true);
  });
});
