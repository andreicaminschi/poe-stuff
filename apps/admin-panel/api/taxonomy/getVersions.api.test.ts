import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";
import { getVersions, toVersionList } from "./getVersions.api.ts";

const at = "2026-01-01T00:00:00Z";
const draft = { state: "draft" as const, createdAt: at };
const published = { state: "published" as const, createdAt: at, publishedAt: at };

describe("toVersionList", () => {
  it("orders versions by their last number, newest first, not as strings", () => {
    const list = toVersionList(
      { next: 11, versions: { "3.29.2": published, "3.29.10": published, "3.29.9": published } },
      undefined,
    );

    expect(list.versions.map((version) => version.id)).toEqual(["3.29.10", "3.29.9", "3.29.2"]);
  });

  it("orders only by the last number, ignoring the rest of the id", () => {
    const list = toVersionList({ next: 3, versions: { "4.0.1": published, "3.29.2": published } }, undefined);

    expect(list.versions.map((version) => version.id)).toEqual(["3.29.2", "4.0.1"]);
  });

  it("makes the newest version editable when it is a draft", () => {
    const list = toVersionList({ next: 3, versions: { "3.29.1": published, "3.29.2": draft } }, undefined);

    expect(list.versions).toEqual([
      { id: "3.29.2", state: "draft", createdAt: at, editable: true },
      { id: "3.29.1", state: "published", createdAt: at, publishedAt: at, editable: false },
    ]);
  });

  it("marks an older draft as overtaken and not editable", () => {
    const list = toVersionList({ next: 3, versions: { "3.29.1": draft, "3.29.2": published } }, undefined);

    expect(list.versions[1]).toMatchObject({ id: "3.29.1", state: "overtaken", editable: false });
  });

  it("makes nothing editable when the newest version is published", () => {
    const list = toVersionList({ next: 3, versions: { "3.29.1": draft, "3.29.2": published } }, undefined);

    expect(list.versions.some((version) => version.editable)).toBe(false);
  });

  it("keeps the parent and the current version only when they are known", () => {
    const list = toVersionList({ next: 2, versions: { "3.29.1": { ...draft, parent: "3.29.0" } } }, "3.29.0");

    expect(list.current).toBe("3.29.0");
    expect(list.versions[0]?.parent).toBe("3.29.0");
    expect("current" in toVersionList({ next: 1, versions: {} }, undefined)).toBe(false);
  });
});

describe("getVersions", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
  });
  afterEach(() => temp.remove());

  it("answers with no versions and no current one on an empty lake", async () => {
    await expect(getVersions(temp.lake)).resolves.toEqual({ versions: [] });
  });

  it("reads the current version off the promoted taxonomy", async () => {
    await temp.lake.writeJson("taxonomy/registry.json", { next: 2, versions: { "3.29.1": published } });
    await temp.lake.writeJson("taxonomy/latest/taxonomy.json", { version: "3.29.1", rows: {} });

    const list = await getVersions(temp.lake);

    expect(list.current).toBe("3.29.1");
    expect(list.versions).toHaveLength(1);
  });
});
