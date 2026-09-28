import { describe, it, expect, jest, beforeEach, afterAll } from "@jest/globals";
import type { CatalogRow } from "@poe/filter-style/types";
import {
  DEFAULT_CONFIG,
  STACK_FLOORS,
  type Catalog,
  type GeneratorApi,
  type GeneratorConfig,
} from "../api/generator-api.ts";
import { useSession } from "./session-store.ts";

const row = (key: string, category: string, meanPrice: number): CatalogRow => ({
  key,
  name: key,
  category,
  subcategory: null,
  baseTypes: [key],
  meanPrice,
});
const catalog: Catalog = {
  rows: [row("Mirror of Kalandra", "Currency", 90000), row("Gold", "Gold", 1), row("Map", "maps", 2)],
  categories: {
    Currency: { conditions: [] },
    Gold: { conditions: [], tiering: "stack-size" },
    maps: { conditions: [] },
  },
};
const floors = { T0: 9, T1: 8, T2: 7, T3: 6, T4: 5, T5: 4 };
const config: GeneratorConfig = { floors, categories: {} };

const api = {
  getCatalog: jest.fn<GeneratorApi["getCatalog"]>(),
  getConfig: jest.fn<GeneratorApi["getConfig"]>(),
  saveConfig: jest.fn<GeneratorApi["saveConfig"]>(),
  saveFilter: jest.fn<GeneratorApi["saveFilter"]>(),
};
const scope = globalThis as { window?: unknown };
scope.window = { generator: api };

afterAll(() => {
  delete scope.window;
});

beforeEach(() => {
  useSession.setState(useSession.getInitialState(), true);
  api.getCatalog.mockResolvedValue(catalog);
  api.getConfig.mockResolvedValue(config);
  api.saveConfig.mockResolvedValue();
  api.saveFilter.mockResolvedValue({ cancelled: true });
});

const state = () => useSession.getState();

const booted = async (on = "Currency") => {
  await state().boot();
  state().selectCategory(on);
};

describe("boot", () => {
  it("loads the catalog and config, marks the config as saved and opens Currency first", async () => {
    await state().boot();

    expect(state()).toMatchObject({ booting: false, catalog, config, saved: config, category: "Currency" });
  }); // Currency outranks "Gold" and "maps" in topCategories

  it("opens no category when the catalog holds no items", async () => {
    api.getCatalog.mockResolvedValue({ rows: [], categories: {} });

    await state().boot();

    expect(state().category).toBeUndefined();
  }); // no `category: undefined` key is spread in

  it("stops booting and shows the error, holding no catalog, when loading fails", async () => {
    api.getConfig.mockRejectedValue(new Error("no disk"));

    await state().boot();

    expect([state().booting, state().error, state().catalog]).toEqual([false, "no disk", undefined]);
  }); // one failed half discards the other

  it("shows a thrown string as the error text", async () => {
    api.getCatalog.mockRejectedValue("offline");

    await state().boot();

    expect(state().error).toBe("offline");
  }); // non-Error rejections go through String()
});

describe("selecting", () => {
  it("clears the selected bucket when another category is opened", async () => {
    await booted();
    state().selectBucket("T1");

    state().selectCategory("maps");

    expect(state().bucket).toBeNull();
  }); // a T1 in Currency means nothing in maps
});

describe("editing a category", () => {
  it("changes nothing before the session has booted", () => {
    state().toggleTier("T1");

    expect(state().config).toBeUndefined();
  }); // guard on missing config and category

  it("disables a tier on the first toggle", async () => {
    await booted("maps");

    state().toggleTier("T2");

    expect(state().config?.categories.maps?.disabled).toEqual(["T2"]);
  }); // starts from the fallback, which disables nothing

  it("enables the tier again on the second toggle", async () => {
    await booted("maps");
    state().toggleTier("T2");

    state().toggleTier("T2");

    expect(state().config?.categories.maps?.disabled).toEqual([]);
  }); // the second call must see the first call's config

  it("changes only the open category's palette", async () => {
    await booted("maps");
    const palette = { primary: "#123456", secondary: "#654321", icon: "Moon" as const };

    state().setPalette(palette);

    expect(state().config?.categories).toEqual({ maps: expect.objectContaining({ palette }) });
  }); // no other category is materialised

  it("wants a name once however often it is added", async () => {
    await booted();

    state().addWanted("Mirror of Kalandra");
    state().addWanted("Mirror of Kalandra");

    expect(state().config?.categories.Currency?.wanted).toEqual(["Mirror of Kalandra"]);
  }); // a duplicate add is a no-op

  it("stops wanting a removed name", async () => {
    await booted();
    state().addWanted("Mirror of Kalandra");

    state().removeWanted("Mirror of Kalandra");

    expect(state().config?.categories.Currency?.wanted).toEqual([]);
  }); // filters by name

  it("keeps the saved config as it was while edits pile up", async () => {
    await booted();

    state().toggleTier("T0");

    expect(state().saved).toBe(config);
  }); // saved vs config is how the window knows there are unsaved changes

  it("clears the last status line as soon as the player edits again", async () => {
    await booted();
    await state().saveConfig();

    state().toggleTier("T0");

    expect(state().status).toBeUndefined();
  }); // "Config saved." must not linger over unsaved edits
});

describe("setFloor", () => {
  it("moves the global floor when a chaos category has no floors of its own", async () => {
    await booted("maps");

    state().setFloor("T0", 500);

    expect(state().config).toEqual({ floors: { ...floors, T0: 500 }, categories: {} });
  }); // global floors are shared by every chaos category

  it("gives a stack-size category its own floors seeded from the stack defaults, leaving the global floors alone", async () => {
    await booted("Gold");

    state().setFloor("T1", 3000);

    expect({ global: state().config?.floors, gold: state().config?.categories.Gold?.floors }).toEqual({
      global: floors,
      gold: { ...STACK_FLOORS, T1: 3000 },
    });
  }); // a stack size must never land on the chaos slider

  it("moves a category's own floors and leaves the global ones alone", async () => {
    api.getConfig.mockResolvedValue({ floors, categories: { maps: { ...DEFAULT_CONFIG.categories.maps!, floors } } });
    await booted("maps");

    state().setFloor("T5", 2);

    expect({ global: state().config?.floors, maps: state().config?.categories.maps?.floors }).toEqual({
      global: floors,
      maps: { ...floors, T5: 2 },
    });
  }); // own floors win even on a chaos category

  it("changes nothing before the session has booted", () => {
    state().setFloor("T0", 1);

    expect(state().config).toBeUndefined();
  }); // needs the catalog to know the tiering
});

describe("saveConfig", () => {
  it("hands the edited config to disk, marks it saved and says so", async () => {
    await booted();
    state().toggleTier("T0");
    const edited = state().config as GeneratorConfig;

    await state().saveConfig();

    expect(api.saveConfig).toHaveBeenCalledWith(edited);
    expect(state()).toMatchObject({ saved: edited, status: "Config saved.", busy: false });
  }); // saves the edit, not the booted config

  it("keeps the old saved config and shows the error when the write fails", async () => {
    await booted();
    api.saveConfig.mockRejectedValue(new Error("disk full"));
    state().toggleTier("T0");

    await state().saveConfig();

    expect(state()).toMatchObject({ saved: config, error: "disk full", busy: false });
  }); // busy is cleared in finally even on failure

  it("is busy while the write is in flight", async () => {
    await booted();
    let finish = () => {};
    api.saveConfig.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    const saving = state().saveConfig();
    const during = state().busy;
    finish();
    await saving;

    expect([during, state().busy]).toEqual([true, false]);
  }); // busy is set synchronously before the await
});

describe("writeFilter", () => {
  it("writes nothing before the session has booted", async () => {
    await state().writeFilter();

    expect(api.saveFilter).not.toHaveBeenCalled();
  }); // no catalog means nothing to write

  it("says how many blocks it wrote, how many it skipped, and where", async () => {
    await booted();
    api.saveFilter.mockResolvedValue({ path: "C:/out.filter" });

    await state().writeFilter();

    expect(state()).toMatchObject({ status: "Wrote 0 blocks, 9 skipped to C:/out.filter", busy: false });
  }); // fixture rows carry no conditions, so every block is skipped

  it("says nothing when the person cancels the save", async () => {
    await booted();

    await state().writeFilter();

    expect([state().status, state().busy]).toEqual([undefined, false]);
  }); // a cancel is not an error either

  it("shows the error when the save fails", async () => {
    await booted();
    api.saveFilter.mockRejectedValue(new Error("denied"));

    await state().writeFilter();

    expect(state()).toMatchObject({ error: "denied", busy: false });
  }); // errors go to the banner, not a throw
});

describe("dismissError", () => {
  it("clears the shown error", async () => {
    api.getConfig.mockRejectedValue(new Error("no disk"));
    await state().boot();

    state().dismissError();

    expect(state().error).toBeUndefined();
  }); // leaves the rest of the session as it was
});
