import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { PoeWatchService } from "@poe/poe-watch/service";

export const icon = (json: object): string =>
  `https://web.poecdn.com/gen/image/${Buffer.from(JSON.stringify(json)).toString("base64url")}/abc/Item.png`;

export const listing = (fields: Record<string, unknown>): ItemData =>
  ({
    id: 1,
    name: "Tabula Rasa",
    category: "armour",
    frame: 3,
    icon: "https://web.poecdn.com/image/Art/Tabula.png",
    influences: "",
    mean: 10.4,
    daily: 7,
    lowConfidence: false,
    ...fields,
  }) as unknown as ItemData;

export const poeWatch = (data: {
  compact?: readonly ItemData[];
  corruptions?: readonly unknown[];
  ratios?: readonly unknown[];
}): PoeWatchService =>
  ({
    getCompactData: async () => data.compact ?? [],
    getCorruptionData: async () => data.corruptions ?? [],
    getExchangeRatios: async () => data.ratios ?? [],
  }) as unknown as PoeWatchService;
