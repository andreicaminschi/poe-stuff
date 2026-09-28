import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { assertEditable } from "./assert-editable.ts";
import { tempLake, type TempLake } from "./temp-lake.test-helpers.ts";

const at = "2026-01-01T00:00:00Z";

describe("assertEditable", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
  });
  afterEach(() => temp.remove());

  const register = (versions: object) => temp.lake.writeJson("taxonomy/registry.json", { next: 3, versions });

  it("lets the newest draft be edited", async () => {
    await register({ "3.29.1": { state: "draft", createdAt: at }, "3.29.2": { state: "draft", createdAt: at } });

    const checked = assertEditable(temp.lake, "3.29.2");

    await expect(checked).resolves.toBeUndefined();
  });

  it("refuses a draft that a newer draft has overtaken", async () => {
    await register({ "3.29.1": { state: "draft", createdAt: at }, "3.29.2": { state: "draft", createdAt: at } });

    const checked = assertEditable(temp.lake, "3.29.1");

    await expect(checked).rejects.toThrow("3.29.1 cannot be edited. Only the newest draft can.");
  }); // still a draft on disk, but not the newest

  it("refuses the newest version once it is published", async () => {
    await register({ "3.29.2": { state: "published", createdAt: at, publishedAt: at } });

    const checked = assertEditable(temp.lake, "3.29.2");

    await expect(checked).rejects.toThrow("3.29.2 cannot be edited");
  }); // newest alone is not enough; it must be a draft

  it("refuses a version the registry does not know", async () => {
    await register({ "3.29.2": { state: "draft", createdAt: at } });

    const checked = assertEditable(temp.lake, "9.9.9");

    await expect(checked).rejects.toThrow("9.9.9 cannot be edited");
  }); // a missing version reads as not editable, not a crash

  it("refuses every version when there is no registry at all", async () => {
    const checked = assertEditable(temp.lake, "3.29.2");

    await expect(checked).rejects.toThrow("3.29.2 cannot be edited. Only the newest draft can.");
  }); // a missing file falls back to an empty registry
});
