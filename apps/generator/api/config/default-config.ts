import type { Palette } from "@poe/filter-style/types";
import type { CategoryConfig, Floors, GeneratorConfig } from "./types.ts";

export const FALLBACK_PALETTE: Palette = { primary: "#b4b4b4", secondary: "#141400", icon: "Circle" };

export const STACK_FLOORS: Floors = { T0: 5000, T1: 2500, T2: 1000, T3: 500, T4: 250, T5: 100 };

const PALETTES: Readonly<Record<string, Palette>> = {
  Currency: { primary: "#f05a23", secondary: "#ffffff", icon: "Star" },
  unique: { primary: "#af6025", secondary: "#ffffff", icon: "Star" },
  foulborn: { primary: "#af6025", secondary: "#ffffff", icon: "Star" },
  MapFragment: { primary: "#b400ff", secondary: "#ffffff", icon: "Star" },
  "divination-cards": { primary: "#0000ff", secondary: "#ffffff", icon: "Star" },
  "skill-gems": { primary: "#14f0f0", secondary: "#460014", icon: "Triangle" },
  bases: { primary: "#00f0be", secondary: "#004b1e", icon: "Diamond" },
  jewels: { primary: "#9600ff", secondary: "#ffffff", icon: "Pentagon" },
  Gold: { primary: "#ebc86e", secondary: "#141400", icon: "Cross" },
  breach: { primary: "#411450", secondary: "#ffffff", icon: "Kite" },
  delve: { primary: "#ff0000", secondary: "#ffffff", icon: "Star" },
  expedition: { primary: "#ff5555", secondary: "#28001e", icon: "UpsideDownHouse" },
  heist: { primary: "#4ae63a", secondary: "#141400", icon: "Pentagon" },
  ritual: { primary: "#ff0000", secondary: "#ffffff", icon: "Star" },
  flask: { primary: "#32c87d", secondary: "#19644b", icon: "Raindrop" },
  maps: { primary: "#64007a", secondary: "#ffffff", icon: "Square" },
  sanctum: { primary: "#ff5555", secondary: "#28001e", icon: "UpsideDownHouse" },
  blight: { primary: "#911edc", secondary: "#ebdcf5", icon: "Square" },
  legion: { primary: "#ff00ff", secondary: "#640064", icon: "Circle" },
  ultimatum: { primary: "#dcdc00", secondary: "#787800", icon: "Hexagon" },
};

const categoryOf = (palette: Palette): CategoryConfig => ({ palette, disabled: [], wanted: [] });

export const DEFAULT_CONFIG: GeneratorConfig = {
  floors: { T0: 150, T1: 50, T2: 30, T3: 10, T4: 5, T5: 1 },
  categories: {
    ...Object.fromEntries(Object.entries(PALETTES).map(([key, palette]) => [key, categoryOf(palette)])),
    Gold: { ...categoryOf(PALETTES.Gold ?? FALLBACK_PALETTE), floors: STACK_FLOORS },
  },
};
