import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { assertEditable } from "./assert-editable.ts";
import { tempLake, type TempLake } from "./temp-lake.test-helpers.ts";

const at = "2026-01-01T00:00:00Z";

describe("assertEditable", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
    await temp.lake.writeJson("taxonomy/registry.json", {
      next: 3,
      versions: { "3.29.1": { state: "draft", createdAt: at }, "3.29.2": { state: "draft", createdAt: at } },
    });
  });
  afterEach(() => temp.remove());

  it("lets the newest draft be edited", async () => {
    await expect(assertEditable(temp.lake, "3.29.2")).resolves.toBeUndefined();
  });

  it("refuses an older draft", async () => {
    await expect(assertEditable(temp.lake, "3.29.1")).rejects.toThrow(
      "3.29.1 cannot be edited. Only the newest draft can.",
    );
  });

  it("refuses a version the registry does not know", async () => {
    await expect(assertEditable(temp.lake, "9.9.9")).rejects.toThrow("9.9.9 cannot be edited");
  });

  it("refuses every id when there is no registry at all", async () => {
    const empty = await tempLake();

    await expect(assertEditable(empty.lake, "3.29.2")).rejects.toThrow(
      "3.29.2 cannot be edited. Only the newest draft can.",
    );
    await empty.remove();
  });
});
