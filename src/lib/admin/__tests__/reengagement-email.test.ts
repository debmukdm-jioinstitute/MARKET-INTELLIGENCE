import { describe, expect, it } from "vitest";
import {
  computeDaysInactive,
  renderReengagementEmail,
  REENGAGEMENT_FEATURES,
} from "../reengagement-email";

describe("reengagement-email", () => {
  it("computes days inactive accurately for logged-in user", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const customer = {
      email: "trader@example.com",
      name: "Rahul Sharma",
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_login_at: tenDaysAgo,
    };

    const res = computeDaysInactive(customer);
    expect(res.hasEverLoggedIn).toBe(true);
    expect(res.days).toBe(10);
  });

  it("computes days inactive accurately for user who never logged in", () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    const customer = {
      email: "newuser@example.com",
      name: "Priya Patel",
      created_at: twentyDaysAgo,
      last_login_at: null,
    };

    const res = computeDaysInactive(customer);
    expect(res.hasEverLoggedIn).toBe(false);
    expect(res.days).toBe(20);
  });

  it("renders email containing dynamic days, market update, hyperlinked features, and log in button", async () => {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const customer = {
      email: "trader@example.com",
      name: "Amit Verma",
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      last_login_at: fourteenDaysAgo,
    };

    const rendered = await renderReengagementEmail({
      customer,
      customMarketUpdate: "FII net flows turned positive in auto and banking sectors today.",
    });

    // Dynamic inactivity
    expect(rendered.daysInactive).toBe(14);
    expect(rendered.subject).toContain("14 days");
    expect(rendered.html).toContain("14 days");
    expect(rendered.text).toContain("14 days");

    // Today's update
    expect(rendered.html).toContain("FII net flows turned positive");
    expect(rendered.text).toContain("FII net flows turned positive");

    // Feature links
    for (const f of REENGAGEMENT_FEATURES) {
      expect(rendered.html).toContain(f.path);
      expect(rendered.text).toContain(f.path);
    }

    // Call to action
    expect(rendered.html).toContain("/login");
    expect(rendered.html).toContain("Log in now");
    expect(rendered.text).toContain("/login");
  });
});
