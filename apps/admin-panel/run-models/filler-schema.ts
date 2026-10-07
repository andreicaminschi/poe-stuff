import type { Command } from "@poe/panel-state/execute-command";
import type { GbnfJsonSchema } from "node-llama-cpp";

export type Vocabulary = {
  readonly conditions: readonly string[];
  readonly valueSets: Readonly<Record<string, readonly string[]>>;
};

type Field = readonly [string, GbnfJsonSchema];

const STRING: GbnfJsonSchema = { type: "string" };
const NAMES: GbnfJsonSchema = { type: "array", items: STRING, minItems: 1 };

const buildObject = (fields: readonly Field[]): GbnfJsonSchema => ({ type: "object", properties: Object.fromEntries(fields) });

/**
 * @example
 * listOrderedSubsets(["tags", "knownItems", "conditions"]);
 * // → [["tags"], ["knownItems"], ["tags", "knownItems"], ["conditions"], ["tags", "conditions"],
 * //    ["knownItems", "conditions"], ["tags", "knownItems", "conditions"]]
 */
const listOrderedSubsets = <T>(entries: readonly T[]): readonly (readonly T[])[] =>
  Array.from({ length: (2 ** entries.length) - 1 }, (_, mask) => entries.filter((_entry, at) => ((mask + 1) & (2 ** at)) !== 0));

function buildConditionValues(valueSets: readonly string[], removal: boolean): GbnfJsonSchema {
  const literal: GbnfJsonSchema = { type: "array", items: { oneOf: [STRING, { type: "boolean" }] }, minItems: 1 };
  const named: readonly GbnfJsonSchema[] = valueSets.length === 0
    ? []
    : [{ enum: valueSets }];
  const dropped: readonly GbnfJsonSchema[] = removal
    ? [{ type: "null" }]
    : [];
  return { oneOf: [literal, ...named, ...dropped] };
}

/**
 * @example
 * buildConditions({ conditions: ["Corrupted", "ItemLevel"], valueSets: { ItemLevel: ["endgame"] } }, false);
 * // → { oneOf: [{ type: "object", properties: { Corrupted: <literal> } },
 * //             { type: "object", properties: { ItemLevel: <literal | "endgame"> } }] }
 */
const buildConditions = (vocabulary: Vocabulary, removal: boolean): GbnfJsonSchema => ({
  oneOf: vocabulary.conditions.map((condition) => buildObject([[condition, buildConditionValues(vocabulary.valueSets[condition] ?? [], removal)]])),
});

const buildSeederPatch = (vocabulary: Vocabulary, removal: boolean): GbnfJsonSchema => ({
  oneOf: listOrderedSubsets<Field>([["tags", NAMES], ["knownItems", NAMES], ["conditions", buildConditions(vocabulary, removal)]]).map(buildObject),
});

const ITEM_PATCH: GbnfJsonSchema = { oneOf: listOrderedSubsets<Field>([["tags", NAMES], ["knownItems", NAMES]]).map(buildObject) };

const TARGETS: GbnfJsonSchema = {
  oneOf: listOrderedSubsets<Field>([["categories", NAMES], ["seeders", NAMES], ["except", NAMES]])
    .filter((fields) => fields[0]?.[0] !== "except")
    .map(buildObject),
};

const buildPatched = (head: Field, add: GbnfJsonSchema, remove: GbnfJsonSchema): GbnfJsonSchema => ({
  oneOf: [buildObject([head, ["add", add]]), buildObject([head, ["remove", remove]]), buildObject([head, ["remove", remove], ["add", add]])],
});

/**
 * @example
 * buildFillerSchemas(vocabulary).moveSeeders;
 * // → { type: "object", properties: { targets: <one of the target shapes>, toCategory: { type: "string" } } }
 */
export function buildFillerSchemas(vocabulary: Vocabulary): Readonly<Record<Command["type"], GbnfJsonSchema>> {
  const add = buildSeederPatch(vocabulary, false);

  return {
    createCategory: buildObject([["category", STRING]]),
    createSeeder: { oneOf: [buildObject([["category", STRING], ["seeder", STRING]]), buildObject([["category", STRING], ["seeder", STRING], ["add", add]])] },
    deleteCategory: buildObject([["category", STRING]]),
    deleteSeeders: buildObject([["targets", TARGETS]]),
    mergeCategory: buildObject([["category", STRING], ["into", STRING]]),
    moveSeeders: buildObject([["targets", TARGETS], ["toCategory", STRING]]),
    rename: buildObject([["target", { enum: ["category", "seeder"] }], ["name", STRING], ["to", STRING]]),
    updateItems: buildPatched(["items", NAMES], ITEM_PATCH, ITEM_PATCH),
    updateSeeders: buildPatched(["targets", TARGETS], add, buildSeederPatch(vocabulary, true)),
  };
}
