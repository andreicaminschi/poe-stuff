import { CONDITIONS } from "@poe/filter-eval/filter-ast";
import type { StateCommand } from "./commands.ts";
import type { ConditionFormat } from "./format-context.ts";
import type { ConditionValue, SeederPatch } from "./types.ts";

/** The function call the agent writes instead of condition values. */
export const FROM_CODE = "#from-code#";

type Registered = { readonly kind: string; readonly games: readonly string[]; readonly order?: readonly string[]; readonly values?: readonly string[] };

const REGISTRY = CONDITIONS as unknown as Readonly<Record<string, Registered>>;

/** PoE1 conditions only: the filter this panel writes is a PoE1 filter. */
export const CONDITION_NAMES: readonly string[] = Object.keys(REGISTRY).filter((name) => REGISTRY[name]?.games.includes("poe1"));

/** Each PoE1 condition's kind, as the filter grammar compares it. */
export const CONDITION_KINDS: Readonly<Record<string, string>> = Object.fromEntries(CONDITION_NAMES.map((name) => [name, REGISTRY[name]?.kind ?? ""]));

/** Named sets a sentinel may ask for. Never a single real value. */
export const PSEUDO_VALUES: Readonly<Record<string, Readonly<Record<string, readonly ConditionValue[]>>>> = {
  Rarity: {
    "non-unique": ["Normal", "Magic", "Rare"],
    "magic-or-better": ["Magic", "Rare", "Unique"],
  },
  HasInfluence: {
    conqueror: ["Crusader", "Hunter", "Redeemer", "Warlord"],
    "shaper-elder": ["Shaper", "Elder"],
    any: ["Shaper", "Elder", "Crusader", "Hunter", "Redeemer", "Warlord"],
  },
  ItemLevel: {
    "usual-breakpoints": [[1, 49], [50, 67], [68, 74], [75, 83], [84, 100]],
    leveling: [[1, 67]],
    endgame: [[68, 100]],
    "max-tier": [[86, 100]],
  },
  Quality: {
    quality: [[1, 30]],
    "high-quality": [[20, 30]],
  },
  LinkedSockets: {
    "five-link": [[5, 5]],
    "six-link": [[6, 6]],
  },
  AreaLevel: {
    leveling: [[1, 67]],
    maps: [[68, 100]],
  },
  MapTier: {
    "white-maps": [[1, 5]],
    "yellow-maps": [[6, 10]],
    "red-maps": [[11, 17]],
  },
};

/** Words a person types for a condition. The context line names the real condition. */
export const SHORTHANDS: Readonly<Record<string, string>> = {
  influences: "HasInfluence",
  influence: "HasInfluence",
  influenced: "HasInfluence",
  fractured: "FracturedItem",
  synthesised: "SynthesisedItem",
  synthesized: "SynthesisedItem",
  corrupted: "Corrupted",
  mirrored: "Mirrored",
  identified: "Identified",
  replica: "Replica",
  foulborn: "Foulborn",
  enchanted: "AnyEnchantment",
  ilvl: "ItemLevel",
  "item level": "ItemLevel",
  "area level": "AreaLevel",
  "map tier": "MapTier",
  links: "LinkedSockets",
  rarity: "Rarity",
  quality: "Quality",
};

/** The values a bare sentinel stands for, or undefined when the condition has no closed set. Low, Sonar 3. */
function listAllValues(condition: string): readonly ConditionValue[] | undefined {
  const registered = REGISTRY[condition];
  if (registered?.kind === "boolean") return [true, false];
  if (registered?.kind === "ordered") return registered.order;
  if (registered?.kind === "enums") return registered.values;
  return undefined;
}

/** Says how a condition's values are filled, for the agent's context. Low, Sonar 1. */
export function describeCondition(condition: string): string {
  const pseudo = Object.keys(PSEUDO_VALUES[condition] ?? {});
  const all = listAllValues(condition) === undefined
    ? "no default"
    : "all by default";

  return `values from code, ${all}${pseudo.length === 0
    ? ""
    : `, or one of: ${pseudo.join(", ")}`}`;
}

/** Every condition name and shorthand the context can describe. */
export const CONDITION_FORMATS: readonly ConditionFormat[] = [
  ...CONDITION_NAMES.map((name) => ({ key: name, description: `condition, ${describeCondition(name)}` })),
  ...Object.entries(SHORTHANDS).map(([word, name]) => ({ key: word, description: `condition ${name}, ${describeCondition(name)}` })),
];

/** Runs one sentinel: all values, or the named pseudo-value. Throws on one code does not know. Low, Sonar 2. */
export function expandSentinel(condition: string, sentinel: string): readonly ConditionValue[] {
  const parameter = sentinel.slice(FROM_CODE.length);

  if (parameter === "") {
    const all = listAllValues(condition);
    if (all === undefined) throw new Error(`${condition} has no default values. Pick one of: ${Object.keys(PSEUDO_VALUES[condition] ?? {}).join(", ") || "none defined"}.`);
    return all;
  }
  const values = PSEUDO_VALUES[condition]?.[parameter];
  if (values === undefined) throw new Error(`${condition} has no pseudo-value "${parameter}".`);
  return values;
}

type Conditions = NonNullable<SeederPatch["conditions"]>;

/** Expands every sentinel in one conditions map; plain value lists pass through. Low, Sonar 1. */
function expandConditions(conditions: Readonly<Record<string, unknown>>): Conditions {
  return Object.fromEntries(Object.entries(conditions).map(([condition, value]) => [condition, typeof value === "string" && value.startsWith(FROM_CODE)
    ? expandSentinel(condition, value)
    : value as readonly ConditionValue[]]));
}

/** Expands the sentinels in a patch's conditions. Low, Sonar 1. */
function expandPatch(patch: SeederPatch | undefined): SeederPatch | undefined {
  if (patch?.conditions === undefined) return patch;
  return { ...patch, conditions: expandConditions(patch.conditions as Readonly<Record<string, unknown>>) };
}

/**
 * Returns the command with every `#from-code#` sentinel replaced by the values code owns,
 * ready for the executor. Commands without conditions come back unchanged. Low, Sonar 1.
 *
 * @example
 * expandCommand({ type: "updateSeeder", category: "Bases", seeder: "Amulets", add: { conditions: { Rarity: "#from-code#non-unique" } } });
 * // → add.conditions.Rarity = ["Normal", "Magic", "Rare"]
 */
export function expandCommand(command: StateCommand): StateCommand {
  if (!("add" in command) && !("remove" in command)) return command;
  const patched = command as StateCommand & { readonly add?: SeederPatch; readonly remove?: SeederPatch };

  return {
    ...patched,
    ...(patched.add === undefined
      ? {}
      : { add: expandPatch(patched.add) }),
    ...(patched.remove === undefined
      ? {}
      : { remove: expandPatch(patched.remove) }),
  } as StateCommand;
}
