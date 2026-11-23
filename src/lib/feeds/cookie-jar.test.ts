import { describe, expect, it } from "vitest";
import {
  cookiePairsFromResponse,
  looksLikeHtmlText,
  mergeCookieHeader,
  stripPoisonCookies,
} from "@/lib/feeds/cookie-jar";

describe("cookie-jar", () => {
  it("merges Set-Cookie pairs by name instead of replacing the jar", () => {
    const merged = mergeCookieHeader("nsit=old; AKA_A2=keep", ["nsit=new", "nseappid=abc"]);
    expect(merged).toBe("nsit=new; AKA_A2=keep; nseappid=abc");
  });

  it("strips Akamai bot-manager cookies and keeps session cookies", () => {
    const stripped = stripPoisonCookies(
      "AKA_A2=ok; ak_bmsc=poison; bm_mi=poison; bm_sz=x; _abck=y; nsit=session",
    );
    expect(stripped).toBe("AKA_A2=ok; nsit=session");
  });

  it("reads a single set-cookie header", () => {
    const res = new Response("", { status: 403, headers: { "set-cookie": "AKA_A2=abc; Path=/; HttpOnly" } });
    expect(cookiePairsFromResponse(res)).toEqual(["AKA_A2=abc"]);
  });

  it("detects HTML WAF bodies", () => {
    expect(looksLikeHtmlText("<!DOCTYPE html><html>Access Denied</html>")).toBe(true);
    expect(looksLikeHtmlText('{"data":[]}')).toBe(false);
  });
});
