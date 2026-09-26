import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PanelApi } from "../api/panel-api.ts";
import type { Draft, GggItem } from "../api/taxonomy/types.ts";
import { useSession } from "./session-store.ts";
import { NO_CHANGES } from "./utils/no-changes.ts";

const item: GggItem = {
  source: "ggg",
  key: "a",
  name: "a",
  classification: { category: "currency", subcategory: null },
  conditions: [],
  listing: { name: "a" },
  variants: [],
};

const draft: Draft = { id: "3.29.7", items: { a: item }, categories: {} };

let appendLedger: jest.Mock<PanelApi["appendLedger"]>;
let popLedger: jest.Mock<PanelApi["popLedger"]>;
let confirm: jest.Mock<(message: string) => boolean>;

beforeEach(() => {
  appendLedger = jest.fn<PanelApi["appendLedger"]>(async () => {});
  popLedger = jest.fn<PanelApi["popLedger"]>(async () => {});
  confirm = jest.fn<(message: string) => boolean>(() => true);
  (globalThis as unknown as { window: unknown }).window = {
    panel: { appendLedger, popLedger },
    confirm,
  };
  useSession.setState({
    versions: { versions: [{ id: "3.29.7", state: "draft", editable: true }] } as never,
    versionId: "3.29.7",
    base: draft,
    ledger: [],
    saved: draft,
    changes: NO_CHANGES,
    selectedKey: "a",
    checked: [],
    busy: false,
    error: undefined,
    status: undefined,
  });
});

describe("useSession", () => {
  it("records an edited item as a change", () => {
    const edited = { ...item, name: "b" };
    useSession.getState().editItem(edited);

    expect(useSession.getState().changes.items).toEqual({ a: edited });
  });

  it("drops every change on revert", () => {
    useSession.getState().editItem({ ...item, name: "b" });
    useSession.getState().revert();

    expect(useSession.getState().changes).toBe(NO_CHANGES);
  });

  it("appends the changes to the ledger as one entry and replays them", async () => {
    const edited = { ...item, name: "b" };
    useSession.getState().editItem(edited);
    await useSession.getState().save();

    expect(appendLedger).toHaveBeenCalledWith(
      "3.29.7",
      expect.objectContaining({ seq: 1, action: "save-items", changes: { items: { a: edited } } }),
    );
    expect(useSession.getState().saved?.items["a"]).toEqual(edited);
    expect(useSession.getState().changes).toBe(NO_CHANGES);
    expect(useSession.getState().status).toBe("Saved 1 edit.");
  });

  it("keeps the changes and reports the error when appending fails", async () => {
    appendLedger.mockRejectedValueOnce(new Error("disk full"));
    useSession.getState().editItem({ ...item, name: "b" });
    await useSession.getState().save();

    expect(useSession.getState().error).toBe("disk full");
    expect(Object.keys(useSession.getState().changes.items)).toEqual(["a"]);
    expect(useSession.getState().ledger).toEqual([]);
  });

  it("refuses to save an item with no listing, and names it", async () => {
    const { listing: _drop, ...unlisted } = item;
    useSession.getState().editItem(unlisted);
    await useSession.getState().save();

    expect(appendLedger).not.toHaveBeenCalled();
    expect(useSession.getState().error).toBe('Pick "Listed as" before saving: a');
    expect(Object.keys(useSession.getState().changes.items)).toEqual(["a"]);
  });

  it("saves a category as its own entry", async () => {
    await useSession.getState().saveCategory({ path: "gem", tiering: "chaos", conditions: [] });

    expect(appendLedger).toHaveBeenCalledWith("3.29.7", expect.objectContaining({ seq: 1, action: "save-category" }));
    expect(Object.keys(useSession.getState().saved?.categories ?? {})).toEqual(["gem"]);
  });

  it("undoes the last save by popping it", async () => {
    useSession.getState().editItem({ ...item, name: "b" });
    await useSession.getState().save();
    await useSession.getState().undo();

    expect(popLedger).toHaveBeenCalledWith("3.29.7", 1);
    expect(useSession.getState().ledger).toEqual([]);
    expect(useSession.getState().saved?.items["a"]?.name).toBe("a");
  });

  it("stays on the item and keeps its edits when discarding is cancelled", () => {
    confirm.mockReturnValueOnce(false);
    useSession.getState().editItem({ ...item, name: "b" });
    useSession.getState().selectItem("b");

    expect(useSession.getState().selectedKey).toBe("a");
    expect(Object.keys(useSession.getState().changes.items)).toEqual(["a"]);
  });

  it("does not ask when switching tabs on the same item", () => {
    useSession.getState().editItem({ ...item, name: "b" });
    useSession.getState().selectItem("a", "variants");

    expect(confirm).not.toHaveBeenCalled();
    expect(useSession.getState().tab).toBe("variants");
  });

  it("refuses to undo over unsaved edits", async () => {
    useSession.getState().editItem({ ...item, name: "b" });
    await useSession.getState().save();
    useSession.getState().editItem({ ...item, name: "c" });
    await useSession.getState().undo();

    expect(popLedger).not.toHaveBeenCalled();
    expect(useSession.getState().error).toBe("Save or revert your edits before undoing.");
  });
});
