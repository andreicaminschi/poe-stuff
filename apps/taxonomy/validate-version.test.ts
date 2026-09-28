import { describe, expect, it } from "@jest/globals";
import type { VersionFiles } from "./types.ts";
import { collectVersion } from "./validate-version.ts";

const files = (extra: Partial<Record<keyof VersionFiles, unknown>> = {}): VersionFiles => ({
  items: { Ring: { name: "Ruby Ring", category: "rings", subcategory: null } },
  categories: {},
  "authored.seeded": {},
  "authored.manual": {},
  "variants.seeded": {},
  "variants.manual": {},
  ...extra,
});

const authoredRow = (baseType: string) => ({ name: "A", baseType, category: "rings", subcategory: null, reason: "r" });

describe("collectVersion", () => {
  it("finds nothing wrong with a valid version", () => {
    expect(collectVersion(files(), new Set())).toEqual([]);
  });

  it("reports a file that is not an object once, keyed by the file", () => {
    expect(collectVersion(files({ categories: [] }), new Set())).toEqual([
      { file: "categories", key: "categories", problem: "is not an object" },
    ]);
  });

  it("reports every problem across files instead of stopping at the first", () => {
    const problems = collectVersion(
      files({
        items: { Ring: { name: "" } },
        "authored.manual": { "authored/a": authoredRow("Nope") },
        "variants.seeded": { Ghost: [{ name: "v", conditions: [] }] },
      }),
      new Set(),
    );

    expect(problems.map((problem) => problem.file)).toEqual(["items", "authored.manual", "variants.seeded"]);
  });

  it("reports a shape problem and a base-type problem on the same authored row", () => {
    const problems = collectVersion(
      files({ "authored.seeded": { "authored/a": { ...authoredRow("Nope"), extra: 1 } } }),
      new Set(),
    );

    expect(problems.map((problem) => problem.problem)).toEqual([
      "has unknown fields: extra",
      "baseType \"Nope\" is not the name of any seed row",
    ]);
  });

  it("checks authored base types against the rejects list", () => {
    const problems = collectVersion(
      files({ "authored.manual": { "authored/a": authoredRow("Ruby Ring") } }),
      new Set(["Ruby Ring"]),
    );

    expect(problems).toEqual([
      { file: "authored.manual", key: "authored/a", problem: "baseType \"Ruby Ring\" is one the client rejects" },
    ]);
  });

  it("knows authored rows as variant owners even when their file is broken elsewhere", () => {
    const problems = collectVersion(
      files({
        "authored.manual": { "authored/a": { ...authoredRow("Ruby Ring"), reason: "" } },
        "variants.manual": { "authored/a": [{ name: "v", conditions: [] }] },
      }),
      new Set(),
    );

    expect(problems.map((problem) => problem.file)).toEqual(["authored.manual"]);
  });
});
