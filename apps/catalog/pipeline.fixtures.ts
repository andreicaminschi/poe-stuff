import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Lake } from "@poe/lake/types";

export const BRONZE = {
  [BRONZE_FILES.gggItems]: [{ id: "g", label: "G", items: [{ kind: "unique", name: "Kaom", baseType: "Ruby Ring", displayText: "Kaom" }] }],
  [BRONZE_FILES.poeWatchCompact]: [
    { id: 1, name: "Ruby Ring", category: "accessory", mean: 5, daily: 1, frame: 0, icon: "", lowConfidence: false },
    { id: 2, name: "Kaom", category: "accessory", mean: 50, daily: 1, frame: 3, icon: "", lowConfidence: false },
  ],
  [BRONZE_FILES.poeWatchCorruptions]: [],
  [BRONZE_FILES.poeWatchRatios]: [{ id: 9, name: "Divine Orb", category: "currency", price: { chaos: 300, lowConfidence: false } }],
  [BRONZE_FILES.taxonomy]: {
    version: "3.29.4",
    items: {
      ring: { name: "Ruby Ring", category: "Rings", subcategory: null },
      unlisted: { name: "Amber Ring", category: "Rings", subcategory: null },
      divine: { name: "Divine Orb", category: "Currency", subcategory: null },
    },
    authored: {},
  },
  [BRONZE_FILES.taxonomyCategories]: { version: "3.29.4", categories: { Rings: { conditions: [] } } },
};

export async function writeBronze(lake: Lake, runId: string, overrides: Record<string, unknown> = {}): Promise<void> {
  for (const [file, value] of Object.entries({ ...BRONZE, ...overrides })) {
    await lake.writeJson(bronzeKey(runId, file), value);
  }
}
