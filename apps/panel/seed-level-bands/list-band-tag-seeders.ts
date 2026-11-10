import type { CreateTagSeederCommand } from "@poe/panel-state/execute-command";
import type { PanelState } from "@poe/panel-state/types";

/** One level band: its tag and the drop levels it covers, both ends included. */
type Band = { readonly tag: string; readonly from: number; readonly to: number };

const LOW = "low level";
const MID = "mid level";
const HIGH = "high level";
const ENDGAME = "endgame";
const TOP = Number.POSITIVE_INFINITY;

const ARMOUR: readonly Band[] = [
  { tag: LOW, from: 1, to: 50 },
  { tag: MID, from: 51, to: 70 },
  { tag: HIGH, from: 71, to: 83 },
  { tag: ENDGAME, from: 84, to: TOP },
];

const WEAPONS: readonly Band[] = [
  { tag: LOW, from: 1, to: 44 },
  { tag: MID, from: 45, to: 59 },
  { tag: HIGH, from: 60, to: 69 },
  { tag: ENDGAME, from: 70, to: TOP },
];

/** The agreed bands per seeder group, the defence split folded back. */
const BANDS: Readonly<Record<string, readonly Band[]>> = {
  "Body Armors": ARMOUR,
  Helmets: ARMOUR,
  Gloves: ARMOUR,
  Boots: ARMOUR,
  Shields: WEAPONS,
  Wands: WEAPONS,
  Daggers: WEAPONS,
  "Rune Daggers": WEAPONS,
  Claws: WEAPONS,
  "One Hand Axes": WEAPONS,
  "One Hand Swords": WEAPONS,
  "Thrusting One Hand Swords": WEAPONS,
  "One Hand Maces": WEAPONS,
  Sceptres: WEAPONS,
  Bows: WEAPONS,
  Staves: WEAPONS,
  Warstaves: WEAPONS,
  "Two Hand Axes": WEAPONS,
  "Two Hand Swords": WEAPONS,
  "Two Hand Maces": WEAPONS,
  Rings: [{ tag: LOW, from: 1, to: 50 }, { tag: MID, from: 51, to: 74 }, { tag: HIGH, from: 75, to: 79 }, { tag: ENDGAME, from: 80, to: TOP }],
  Amulets: [{ tag: LOW, from: 1, to: 50 }, { tag: HIGH, from: 51, to: 79 }, { tag: ENDGAME, from: 80, to: TOP }],
  Belts: [{ tag: LOW, from: 1, to: 50 }, { tag: MID, from: 51, to: 72 }, { tag: ENDGAME, from: 73, to: TOP }],
  Quivers: [{ tag: LOW, from: 1, to: 44 }, { tag: MID, from: 45, to: 59 }, { tag: HIGH, from: 60, to: 73 }, { tag: ENDGAME, from: 74, to: TOP }],
  Talismans: [{ tag: LOW, from: 1, to: 27 }, { tag: MID, from: 28, to: 35 }, { tag: HIGH, from: 36, to: 44 }, { tag: ENDGAME, from: 45, to: TOP }],
  "Fishing Rods": [{ tag: LOW, from: 1, to: TOP }],
};

/** The seeder group a seeder belongs to: its name before the defence split's " - ". */
const readGroup = (seeder: string): string => seeder.split(" - ")[0] ?? seeder;

/**
 * Builds one `createTagSeeder` per seeder group of `category` per band that holds a base, named
 * `<group> <band>`. A base with no drop level is left out and listed. Throws on a group with no
 * agreed bands, so a new group is never tagged by guess.
 *
 * @example
 * listBandTagSeeders(state, "Bases", new Map([["Royal Plate", 84], ["Plate Vest", 1]]));
 * // → { commands: [{ type: "createTagSeeder", name: "Body Armors low level", conditions: { BaseType: ["Plate Vest"] }, tags: ["low level"] },
 * //               { type: "createTagSeeder", name: "Body Armors endgame", conditions: { BaseType: ["Royal Plate"] }, tags: ["endgame"] }], unknown: [] }
 */
export function listBandTagSeeders(state: PanelState, category: string, dropLevels: ReadonlyMap<string, number>): {
  readonly commands: readonly CreateTagSeederCommand[];
  readonly unknown: readonly string[];
} {
  const seeders = Object.entries(state.categories[category]?.seeders ?? {});
  const groups = Map.groupBy(seeders, ([name]) => readGroup(name));
  const commands: CreateTagSeederCommand[] = [];
  const unknown: string[] = [];

  for (const [group, entries] of groups) {
    const bands = BANDS[group];
    if (bands === undefined) throw new Error(`No level bands agreed for seeder group "${group}".`);
    const bases = [...new Set(entries.flatMap(([, seeder]) => Object.keys(seeder.conditions?.BaseType ?? {})))];
    unknown.push(...bases.filter((base) => !dropLevels.has(base)));
    for (const band of bands) {
      const inBand = bases.filter((base) => {
        const level = dropLevels.get(base);
        return level !== undefined && level >= band.from && level <= band.to;
      }).toSorted();
      if (inBand.length > 0) commands.push({ type: "createTagSeeder", name: `${group} ${band.tag}`, conditions: { BaseType: inBand }, tags: [band.tag] });
    }
  }
  return { commands, unknown };
}
