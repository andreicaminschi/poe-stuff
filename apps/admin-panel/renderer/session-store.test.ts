import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PanelApi } from "../api/panel-api.ts";
import type { Draft, GggItem } from "../api/taxonomy.types.ts";
import { useSession } from "./session-store.ts";
import { NO_CHANGES } from "./utils/no-changes.ts";

const item: GggItem = {
  source: "ggg",
  key: "a",
  name: "a",
  classification: { category: "currency", subcategory: null },
  conditions: [],
  variants: [],
};

const draft: Draft = { id: "3.29.7", items: { a: item }, categories: {} };

let saveDraft: jest.Mock<PanelApi["saveDraft"]>;
let getVersion: jest.Mock<PanelApi["getVersion"]>;

beforeEach(() => {
  saveDraft = jest.fn<PanelApi["saveDraft"]>(async () => {});
  getVersion = jest.fn<PanelApi["getVersion"]>(async () => draft);
  (globalThis as unknown as { window: unknown }).window = {
    panel: { saveDraft, getVersion },
    confirm: () => true,
  };
  useSession.setState({
    versionId: "3.29.7",
    saved: draft,
    changes: NO_CHANGES,
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

  it("saves the changes, reloads the draft and clears the changes", async () => {
    const edited = { ...item, name: "b" };
    useSession.getState().editItem(edited);
    await useSession.getState().save();

    expect(saveDraft).toHaveBeenCalledWith("3.29.7", { items: { a: edited } });
    expect(getVersion).toHaveBeenCalledWith("3.29.7");
    expect(useSession.getState().changes).toBe(NO_CHANGES);
    expect(useSession.getState().status).toBe("Saved 1 edit.");
  });

  it("keeps the changes and reports the error when saving fails", async () => {
    saveDraft.mockRejectedValueOnce(new Error("disk full"));
    useSession.getState().editItem({ ...item, name: "b" });
    await useSession.getState().save();

    expect(useSession.getState().error).toBe("disk full");
    expect(Object.keys(useSession.getState().changes.items)).toEqual(["a"]);
  });
});
