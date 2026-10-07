import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cached: null as unknown,
  redis: false,
  build: vi.fn(),
  set: vi.fn(),
  after: vi.fn(),
}));

vi.mock("@/lib/cache/redis", () => ({
  cacheGetManyJson: async (keys: string[]) => keys.map((_, i) => (i === 0 ? state.cached : null)),
  cacheSetJson: state.set,
  hasRedis: () => state.redis,
}));
vi.mock("@/lib/feeds/research-detail", () => ({ buildResearchDetail: state.build }));
vi.mock("next/server", () => ({ after: state.after }));
vi.mock("../research-symbol-client", () => ({ ResearchSymbolClient: () => null }));

import ResearchSymbolPage from "../page";

type Props = { initialData: { name: string } | null; initialAgeMs: number | null };
const render = async (sym: string) =>
  ((await ResearchSymbolPage({ params: Promise.resolve({ symbol: sym }) })) as { props: Props }).props;

beforeEach(() => {
  state.cached = null;
  state.redis = false;
  state.build.mockReset();
  state.set.mockReset();
  state.after.mockReset();
});

describe("research/[symbol] server page", () => {
  it("uses the Redis dossier when present and never builds live", async () => {
    state.cached = { value: { name: "Eternal Ltd" }, ageMs: 5_000 };
    const p = await render("eternal");
    expect(p.initialData?.name).toBe("Eternal Ltd");
    expect(p.initialAgeMs).toBe(5_000);
    expect(state.build).not.toHaveBeenCalled();
  });

  it("falls back to a live build on a cache miss (Redis off) so HTML has data", async () => {
    state.build.mockResolvedValue({ name: "Eternal Ltd" });
    const p = await render("ETERNAL");
    expect(state.build).toHaveBeenCalledWith("ETERNAL");
    expect(p.initialData?.name).toBe("Eternal Ltd");
    expect(p.initialAgeMs).toBe(0);
    expect(state.after).not.toHaveBeenCalled(); // nothing to write when Redis is off
  });

  it("gives up after the timeout, renders the client shell, and caches in after() when Redis is on", async () => {
    state.redis = true;
    state.build.mockImplementation(() => new Promise((r) => setTimeout(() => r({ name: "Slow Co" }), 2_200)));
    const t0 = Date.now();
    const p = await render("SLOW");
    expect(Date.now() - t0).toBeLessThan(2_000);
    expect(p.initialData).toBeNull();
    expect(state.after).toHaveBeenCalledTimes(1);
    await (state.after.mock.calls[0]![0] as () => Promise<void>)();
    expect(state.set).toHaveBeenCalledWith("dossier:v1:SLOW", { name: "Slow Co" }, 900);
  }, 10_000);

  it("does not build for junk symbols", async () => {
    const p = await render("%3Cscript%3E");
    expect(p.initialData).toBeNull();
    expect(state.build).not.toHaveBeenCalled();
  });
});
