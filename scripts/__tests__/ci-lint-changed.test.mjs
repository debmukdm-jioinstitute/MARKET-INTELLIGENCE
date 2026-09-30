import { describe, expect, it } from "vitest";
import { selectLintTargets } from "../ci-lint-changed.mjs";

const exists = (name) => name === "src/changed.ts" || name === "src/changed.tsx";

describe("selectLintTargets", () => {
  it("keeps changed TS/TSX files that still exist", () => {
    const out = selectLintTargets(
      ["src/changed.ts", "src/changed.tsx", "docs/notes.md", "src/deleted.ts"],
      exists,
    );
    expect(out).toEqual(["src/changed.ts", "src/changed.tsx"]);
  });

  it("drops deleted files and non-source files", () => {
    expect(selectLintTargets(["src/deleted.ts", "package.json", ""], exists)).toEqual([]);
  });

  it("dedupes repeated entries", () => {
    expect(selectLintTargets(["src/changed.ts", "src/changed.ts"], exists)).toEqual(["src/changed.ts"]);
  });
});
