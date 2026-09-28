import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { PanelApi } from "../api/panel-api.ts";
import type { Draft, Ledger, VersionList } from "../api/panel-api.ts";
import { useSession } from "./session-store.ts";
import { category, draftOf, ggg } from "./test-helpers.ts";

const versions: VersionList = {
  versions: [
    { id: "3.29.4", state: "draft", createdAt: "t", editable: true },
    { id: "3.29.3", state: "published", createdAt: "t", editable: false },
  ],
  current: "3.29.3",
} as VersionList;

const at = (category: string, subcategory: string | null) => ({ classification: { category, subcategory } });

const base = draftOf(
  [ggg("a", { ...at("gems", "support"), listing: { name: "a" } }), ggg("b", at("maps", null))],
  [category("gems"), category("gems/support")],
);

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => (resolve = settle));
  return { promise, resolve };
};

let panel: { [K in keyof PanelApi]: jest.Mock<PanelApi[K]> };

const fakePanel = () =>
  ({
    getVersions: jest.fn(async () => versions),
    getVersion: jest.fn(async (): Promise<Draft> => base),
    getLedger: jest.fn(async (): Promise<Ledger> => []),
    appendLedger: jest.fn(async () => {}),
    popLedger: jest.fn(async () => {}),
    commitLedger: jest.fn(async () => {}),
    getListingNames: jest.fn(async () => [{ name: "l", label: "listing", listing: { name: "Zed" } }]),
    getExchangeNames: jest.fn(async () => [{ name: "e", label: "exchange", listing: { name: "Alpha" } }]),
    getCorruptionNames: jest.fn(async () => [{ name: "c", label: "corruption", listing: { name: "Zed" } }]),
    validate: jest.fn(async () => ({ rows: [] })),
    compileFilter: jest.fn(async () => ({ blocks: 3, path: "out.filter", skipped: [] })),
    validateFilter: jest.fn(async () => ({ rows: [] })),
    saveReport: jest.fn(async () => ({ path: "r.csv", queries: "q.json" })),
    createVersion: jest.fn(async () => ({ ok: true, log: " created \n" })),
    publishVersion: jest.fn(async () => ({ ok: true, log: "" })),
    promoteVersion: jest.fn(async () => ({ ok: true, log: "" })),
  }) as unknown as typeof panel;

const state = () => useSession.getState();

const loaded = async (): Promise<void> => {
  useSession.setState({ versions, versionId: "3.29.4", base, saved: base, ledger: [] });
};

const answer = async (ok: boolean): Promise<void> => {
  await Promise.resolve();
  state().confirmation?.settle(ok);
};

beforeEach(() => {
  useSession.setState(useSession.getInitialState(), true);
  panel = fakePanel();
  (globalThis as { window?: unknown }).window = { panel };
});

describe("useSession", () => {
  describe("boot", () => {
    it("opens the editable version and merges every price source into sorted options", async () => {
      await state().boot();

      expect(state()).toMatchObject({ versionId: "3.29.4", booting: false, saved: base });
      expect(state().priceOptions.map((option) => [option.value, option.label])).toEqual([
        ["Alpha", "exchange"],
        ["Zed", "listing · corruption"],
      ]);
    });

    it("marks each step done with a count", async () => {
      await state().boot();

      expect(state().bootSteps.map((step) => [step.id, step.state, step.detail])).toEqual([
        ["versions", "done", "2 versions"],
        ["draft", "done", "3.29.4, 0 saved edits"],
        ["listings", "done", "1 names"],
        ["exchange", "done", "1 names"],
        ["corruptions", "done", "1 outcomes"],
      ]);
    });

    it("falls back to the current version when none is editable", async () => {
      panel.getVersions.mockResolvedValue({
        ...versions,
        versions: versions.versions.map((v) => ({ ...v, editable: false })),
      });

      await state().boot();

      expect(state().versionId).toBe("3.29.3");
    });

    it("says there is no version to open and still downloads prices", async () => {
      panel.getVersions.mockResolvedValue({ versions: [] });

      await state().boot();

      expect(state().bootSteps[1]).toMatchObject({ state: "done", detail: "no version to open" });
      expect(state().booting).toBe(false);
    });

    it("stops at a failed step and stops booting", async () => {
      panel.getVersions.mockRejectedValue(new Error("offline"));

      await state().boot();

      expect(state().bootSteps[0]).toMatchObject({ state: "failed", detail: "offline" });
      expect(state().bootSteps[1]?.state).toBe("waiting");
      expect(state().booting).toBe(false);
    });

    it("keeps the other prices when one download fails", async () => {
      panel.getExchangeNames.mockRejectedValue(new Error("down"));

      await state().boot();

      expect(state().priceOptions.map((option) => option.value)).toEqual(["Zed"]);
      expect(state().booting).toBe(false);
    });

    it("does nothing when called again while the first boot is running", async () => {
      const first = state().boot();
      await state().boot();
      await first;

      expect(panel.getVersions).toHaveBeenCalledTimes(1);
    });
  });

  describe("switchVersion", () => {
    it("ignores a draft that arrives after the user switched again", async () => {
      await loaded();
      const slow = deferred<Draft>();
      const other = draftOf([ggg("z")]);
      panel.getVersion.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(other);

      await state().switchVersion("old");
      await state().switchVersion("new");
      await new Promise((settle) => setTimeout(settle, 0));
      slow.resolve(base);
      await new Promise((settle) => setTimeout(settle, 0));

      expect(state()).toMatchObject({ versionId: "new", base: other });
    });

    it("stays put when the user declines to discard edits", async () => {
      await loaded();
      state().editItem(ggg("x"));

      const switching = state().switchVersion("3.29.3");
      await answer(false);
      await switching;

      expect(state().versionId).toBe("3.29.4");
    });
  });

  describe("leaving edits", () => {
    it("asks before selecting a category while there are unsaved edits and discards on yes", async () => {
      await loaded();
      state().editItem(ggg("x"));

      const selecting = state().select("maps");
      await answer(true);
      await selecting;

      expect(state()).toMatchObject({ selection: "maps", changes: { items: {}, categories: {} } });
    });

    it("keeps the edits and selection when the user says no", async () => {
      await loaded();
      state().editItem(ggg("x"));

      const selecting = state().select("maps");
      await answer(false);
      await selecting;

      expect(state().selection).toBeUndefined();
      expect(Object.keys(state().changes.items)).toEqual(["x"]);
    });

    it("does not ask when reselecting the item already open", async () => {
      await loaded();
      useSession.setState({ selectedKey: "a" });
      state().editItem(ggg("a"));

      await state().selectItem("a", "variants");

      expect(state().confirmation).toBeUndefined();
      expect(state().tab).toBe("variants");
    });

    it("clears the confirmation once it is answered", async () => {
      const asking = state().confirm("Sure?");
      await answer(true);

      expect(await asking).toBe(true);
      expect(state().confirmation).toBeUndefined();
    });
  });

  describe("selection", () => {
    it("toggles a category off when it is selected again", async () => {
      await state().toggleCategory("gems");
      await state().toggleCategory("gems");

      expect(state().selection).toBeUndefined();
    });

    it("opens the item when exactly one row is checked", async () => {
      await state().toggleChecked("a");

      expect(state()).toMatchObject({ checked: ["a"], selectedKey: "a" });
    });

    it("keeps the last opened item when a second row is checked", async () => {
      await state().toggleChecked("a");
      await state().toggleChecked("b");

      expect(state()).toMatchObject({ checked: ["a", "b"], selectedKey: "a" });
    });

    it("closes the item when every row is unchecked", async () => {
      await state().toggleChecked("a");
      await state().toggleChecked("a");

      expect(state()).toMatchObject({ checked: [], selectedKey: undefined });
    });

    it("goes to a row's view, category and item tab", async () => {
      await loaded();
      useSession.setState({
        saved: draftOf([ggg("x", { ...at("gems", "support"), excluded: true })]),
        dialog: { kind: "runs" },
      });

      await state().goTo("x");

      expect(state()).toMatchObject({
        view: "excluded",
        selection: "gems/support",
        selectedKey: "x",
        tab: "item",
        dialog: undefined,
      });
    });

    it("stays put when going to a row that does not exist", async () => {
      await loaded();

      await state().goTo("missing");

      expect(state().selectedKey).toBeUndefined();
    });
  });

  describe("editing", () => {
    it("collects several edited items, the last edit of a key winning", () => {
      state().editItems([ggg("a"), ggg("b"), ggg("a", { quest: true })]);

      expect(state().changes.items["a"]?.quest).toBe(true);
      expect(Object.keys(state().changes.items)).toEqual(["a", "b"]);
    });

    it("authors a row into the changes and opens it", async () => {
      await state().authorRow(ggg("new", at("maps", "boss")));

      expect(state()).toMatchObject({ selection: "maps/boss", selectedKey: "new", view: "included" });
      expect(Object.keys(state().changes.items)).toEqual(["new"]);
    });
  });

  describe("save", () => {
    it("appends the edits as the next ledger entry and clears them", async () => {
      await loaded();
      useSession.setState({ ledger: [{ seq: 4, at: "t", action: "save-items", changes: {} }] });
      state().editItem(ggg("b", { listing: { name: "b" } }));

      await state().save();

      expect(panel.appendLedger.mock.calls[0]?.[1]).toMatchObject({
        seq: 5,
        action: "save-items",
        changes: { items: { b: {} } },
      });
      expect(state()).toMatchObject({ status: "Saved 1 edit.", changes: { items: {}, categories: {} } });
      expect(state().saved?.items["b"]?.listing).toEqual({ name: "b" });
    });

    it("refuses to save while an edited row has no listing", async () => {
      await loaded();
      state().editItem(ggg("b"));

      await state().save();

      expect(state().error).toBe("Pick \"Listed as\" before saving: b");
      expect(panel.appendLedger).not.toHaveBeenCalled();
    });

    it("does nothing with no edits", async () => {
      await loaded();

      await state().save();

      expect(panel.appendLedger).not.toHaveBeenCalled();
    });

    it("reports a failed write as an error and is no longer busy", async () => {
      await loaded();
      panel.appendLedger.mockRejectedValue(new Error("disk full"));
      state().editItem(ggg("b", { listing: { name: "b" } }));

      await state().save();

      expect(state()).toMatchObject({ error: "disk full", busy: false });
      expect(Object.keys(state().changes.items)).toEqual(["b"]);
    });
  });

  describe("undo", () => {
    it("pops the last entry and replays the rest", async () => {
      await loaded();
      useSession.setState({
        ledger: [{ seq: 1, at: "t", action: "delete-category", changes: { categories: { gems: null } } }],
      });

      await state().undo();

      expect(panel.popLedger).toHaveBeenCalledWith("3.29.4", 1);
      expect(state()).toMatchObject({ ledger: [], status: "Undid delete-category #1." });
      expect(state().saved?.categories["gems"]).toBeDefined();
    });

    it("does nothing on a version that is not editable", async () => {
      await loaded();
      useSession.setState({ versionId: "3.29.3", ledger: [{ seq: 1, at: "t", action: "save-items", changes: {} }] });

      await state().undo();

      expect(panel.popLedger).not.toHaveBeenCalled();
    });

    it("refuses while there are unsaved edits", async () => {
      await loaded();
      useSession.setState({ ledger: [{ seq: 1, at: "t", action: "save-items", changes: {} }] });
      state().editItem(ggg("x"));

      await state().undo();

      expect(state().error).toBe("Save or revert your edits before undoing.");
    });
  });

  describe("categories", () => {
    it("follows a moved subcategory with the selection and counts its rows", async () => {
      await loaded();
      useSession.setState({ selection: "gems/support" });

      await state().moveSubcategory("gems/support", category("skills/support"));

      expect(state()).toMatchObject({
        selection: "skills/support",
        status: "Moved gems/support to skills/support, 1 row.",
      });
    });

    it("shows a refused move as an error and writes nothing", async () => {
      await loaded();

      await state().moveSubcategory("gems", category("skills/gems"));

      expect(state().error).toBe("gems is not a subcategory.");
      expect(panel.appendLedger).not.toHaveBeenCalled();
    });

    it("refuses to move while there are unsaved edits", async () => {
      await loaded();
      state().editItem(ggg("x"));

      await state().moveSubcategory("gems/support", category("skills/support"));

      expect(state().error).toBe("Save or revert your edits before moving a subcategory.");
    });

    it("follows a renamed category into a selected child", async () => {
      await loaded();
      useSession.setState({ selection: "gems/support" });

      await state().renameCategory("gems", category("skills"));

      expect(state()).toMatchObject({ selection: "skills/support", status: "Renamed gems to skills, 1 row." });
    });

    it("leaves a selection whose path only starts with the same letters", async () => {
      await loaded();
      useSession.setState({ selection: "gemstones" });

      await state().renameCategory("gems", category("skills"));

      expect(state().selection).toBe("gemstones");
    });

    it("clears the selection when the selected category is deleted", async () => {
      await loaded();
      useSession.setState({ selection: "gems", selectedKey: "a", checked: ["a"] });

      await state().deleteCategory("gems");

      expect(state()).toMatchObject({
        selection: undefined,
        selectedKey: undefined,
        checked: [],
        status: "Deleted gems.",
      });
    });

    it("keeps the selection when a subcategory of it is deleted", async () => {
      await loaded();
      useSession.setState({ selection: "gems" });

      await state().deleteCategory("gems/support");

      expect(state().selection).toBe("gems");
    });

    it("writes a saved category to the ledger", async () => {
      await loaded();

      await state().saveCategory(category("maps", { name: "Maps" }));

      expect(state().saved?.categories["maps"]?.name).toBe("Maps");
      expect(state().status).toBe("Saved maps.");
    });
  });

  describe("filter tools", () => {
    it("opens the compiled dialog only when blocks were skipped", async () => {
      await loaded();

      await state().compileFilter();

      expect(state().status).toBe("Wrote 3 blocks to out.filter. 0 skipped.");
      expect(state().dialog).toBeUndefined();
    });

    it("opens the compiled dialog when something was skipped", async () => {
      await loaded();
      panel.compileFilter.mockResolvedValue({ blocks: 1, path: "p", skipped: [{}] } as never);

      await state().compileFilter();

      expect(state().dialog).toEqual({ kind: "compiled" });
    });

    it("sends only the changed side of the edits to validation", async () => {
      await loaded();
      state().editItem(ggg("x"));

      await state().validate();

      expect(panel.validate).toHaveBeenCalledWith("3.29.4", { items: { x: ggg("x") } });
      expect(state().dialog).toEqual({ kind: "validation" });
    });
  });

  describe("publish", () => {
    it("commits, validates, publishes and promotes after a yes", async () => {
      await loaded();

      const publishing = state().publish();
      await answer(true);
      await publishing;

      expect(panel.commitLedger).toHaveBeenCalledWith("3.29.4");
      expect(panel.promoteVersion).toHaveBeenCalledWith("3.29.4");
      expect(state().status).toBe("3.29.4 is published and current.");
    });

    it("stops before publishing when validation finds rows", async () => {
      await loaded();
      panel.validate.mockResolvedValue({ rows: [{}] } as never);

      const publishing = state().publish();
      await answer(true);
      await publishing;

      expect(panel.publishVersion).not.toHaveBeenCalled();
      expect(state().dialog).toEqual({ kind: "validation" });
    });

    it("shows a failed publish's log as the error", async () => {
      await loaded();
      panel.publishVersion.mockResolvedValue({ ok: false, log: "boom" } as never);

      const publishing = state().publish();
      await answer(true);
      await publishing;

      expect(state().error).toBe("boom");
      expect(panel.promoteVersion).not.toHaveBeenCalled();
    });

    it("does nothing after a no", async () => {
      await loaded();

      const publishing = state().publish();
      await answer(false);
      await publishing;

      expect(panel.commitLedger).not.toHaveBeenCalled();
    });
  });

  describe("newDraft", () => {
    it("opens the new editable version with the trimmed log as status", async () => {
      await loaded();

      await state().newDraft("3.29.3");

      expect(panel.createVersion).toHaveBeenCalledWith("3.29.3");
      expect(state()).toMatchObject({ versionId: "3.29.4", status: "created", saved: base });
    });

    it("shows a failed creation's log as the error", async () => {
      panel.createVersion.mockResolvedValue({ ok: false, log: "no parent" } as never);

      await state().newDraft("x");

      expect(state().error).toBe("no parent");
    });
  });
});
