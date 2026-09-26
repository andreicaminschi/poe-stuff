import { describe, it, expect, jest, beforeEach, afterAll } from "@jest/globals";
import type { CatalogRow } from "@poe/filter-style/types";
import { DEFAULT_CONFIG, STACK_FLOORS, type Catalog, type GeneratorApi, type GeneratorConfig } from "../api/generator-api.ts";
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
  categories: { Currency: { conditions: [] }, Gold: { conditions: [], tiering: "stack-size" }, maps: { conditions: [] } },
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

const booted = async (on = "Currency") => {
  await useSession.getState().boot();
  useSession.getState().selectCategory(on);
};

describe("boot", () => {
  it("loads the catalog and config, marks the config saved and opens Currency first", async () => {
    await useSession.getState().boot();

    expect(useSession.getState()).toMatchObject({ booting: false, catalog, config, saved: config, category: "Currency" });
  });

  it("opens no category when the catalog holds no items", async () => {
    api.getCatalog.mockResolvedValue({ rows: [], categories: {} });

    await useSession.getState().boot();

    expect(useSession.getState().category).toBeUndefined();
  });

  it("stops booting and shows the error when loading fails", async () => {
    api.getConfig.mockRejectedValue(new Error("no disk"));

    await useSession.getState().boot();

    expect(useSession.getState()).toMatchObject({ booting: false, error: "no disk" });
    expect(useSession.getState().catalog).toBeUndefined();
  });

  it("shows a thrown non-error as text", async () => {
    api.getCatalog.mockRejectedValue("offline");

    await useSession.getState().boot();

    expect(useSession.getState().error).toBe("offline");
  });
});

describe("selecting", () => {
  it("clears the selected bucket when another category is opened", async () => {
    await booted();
    useSession.getState().selectBucket("T1");

    useSession.getState().selectCategory("maps");

    expect(useSession.getState().bucket).toBeNull();
  });
});

describe("editing a category", () => {
  it("does nothing before boot", () => {
    useSession.getState().toggleTier("T1");

    expect(useSession.getState().config).toBeUndefined();
  });

  it("disables a tier on the first toggle and enables it on the second", async () => {
    await booted("maps");

    useSession.getState().toggleTier("T2");
    expect(useSession.getState().config?.categories.maps?.disabled).toEqual(["T2"]);

    useSession.getState().toggleTier("T2");
    expect(useSession.getState().config?.categories.maps?.disabled).toEqual([]);
  });

  it("changes only the open category's palette", async () => {
    await booted("maps");
    const palette = { primary: "#123456", secondary: "#654321", icon: "Moon" as const };

    useSession.getState().setPalette(palette);

    expect(Object.keys(useSession.getState().config?.categories ?? {})).toEqual(["maps"]);
    expect(useSession.getState().config?.categories.maps?.palette).toEqual(palette);
  });

  it("wants a name once however often it is added", async () => {
    await booted();

    useSession.getState().addWanted("Mirror of Kalandra");
    useSession.getState().addWanted("Mirror of Kalandra");

    expect(useSession.getState().config?.categories.Currency?.wanted).toEqual(["Mirror of Kalandra"]);
  });

  it("stops wanting a removed name", async () => {
    await booted();
    useSession.getState().addWanted("Mirror of Kalandra");

    useSession.getState().removeWanted("Mirror of Kalandra");

    expect(useSession.getState().config?.categories.Currency?.wanted).toEqual([]);
  });

  it("leaves the saved config behind as edits pile up", async () => {
    await booted();

    useSession.getState().toggleTier("T0");

    expect(useSession.getState().saved).toBe(config);
  });
});

describe("setFloor", () => {
  it("moves the global floor for a chaos category with no floors of its own", async () => {
    await booted("maps");

    useSession.getState().setFloor("T0", 500);

    expect(useSession.getState().config).toEqual({ floors: { ...floors, T0: 500 }, categories: {} });
  });

  it("gives a stack-size category its own floors seeded from the stack defaults", async () => {
    await booted("Gold");

    useSession.getState().setFloor("T1", 3000);

    expect(useSession.getState().config?.floors).toEqual(floors);
    expect(useSession.getState().config?.categories.Gold?.floors).toEqual({ ...STACK_FLOORS, T1: 3000 });
  });

  it("moves a category's own floors and leaves the global ones alone", async () => {
    api.getConfig.mockResolvedValue({ floors, categories: { maps: { ...DEFAULT_CONFIG.categories.maps!, floors } } });
    await booted("maps");

    useSession.getState().setFloor("T5", 2);

    expect(useSession.getState().config?.floors).toEqual(floors);
    expect(useSession.getState().config?.categories.maps?.floors).toEqual({ ...floors, T5: 2 });
  });

  it("does nothing before boot", () => {
    useSession.getState().setFloor("T0", 1);

    expect(useSession.getState().config).toBeUndefined();
  });
});

describe("saveConfig", () => {
  it("marks the edited config saved and says so", async () => {
    await booted();
    useSession.getState().toggleTier("T0");
    const edited = useSession.getState().config as GeneratorConfig;

    await useSession.getState().saveConfig();

    expect(api.saveConfig).toHaveBeenCalledWith(edited);
    expect(useSession.getState()).toMatchObject({ saved: edited, status: "Config saved.", busy: false });
  });

  it("keeps the old saved config and shows the error when the write fails", async () => {
    await booted();
    api.saveConfig.mockRejectedValue(new Error("disk full"));
    useSession.getState().toggleTier("T0");

    await useSession.getState().saveConfig();

    expect(useSession.getState()).toMatchObject({ saved: config, error: "disk full", busy: false });
  });

  it("is busy while the write is in flight", async () => {
    await booted();
    let finish = () => {};
    api.saveConfig.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    const saving = useSession.getState().saveConfig();
    expect(useSession.getState().busy).toBe(true);

    finish();
    await saving;
    expect(useSession.getState().busy).toBe(false);
  });
});

describe("writeFilter", () => {
  it("does nothing before boot", async () => {
    await useSession.getState().writeFilter();

    expect(api.saveFilter).not.toHaveBeenCalled();
  });

  it("says how many blocks it wrote and where", async () => {
    await booted();
    api.saveFilter.mockResolvedValue({ path: "C:/out.filter" });

    await useSession.getState().writeFilter();

    expect(useSession.getState().status).toBe("Wrote 0 blocks, 9 skipped to C:/out.filter") // fixture rows lack conditions;
    expect(useSession.getState().busy).toBe(false);
  });

  it("says nothing when the person cancels the save", async () => {
    await booted();

    await useSession.getState().writeFilter();

    expect(useSession.getState().status).toBeUndefined();
    expect(useSession.getState().busy).toBe(false);
  });

  it("shows the error when the save fails", async () => {
    await booted();
    api.saveFilter.mockRejectedValue(new Error("denied"));

    await useSession.getState().writeFilter();

    expect(useSession.getState()).toMatchObject({ error: "denied", busy: false });
  });
});

describe("dismissError", () => {
  it("clears the shown error", async () => {
    api.getConfig.mockRejectedValue(new Error("no disk"));
    await useSession.getState().boot();

    useSession.getState().dismissError();

    expect(useSession.getState().error).toBeUndefined();
  });
});
