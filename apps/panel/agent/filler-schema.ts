import type { AgentCommand } from "@poe/panel-state/execute-command";
import type { Vocabulary } from "@poe/agent-input/vocabulary";
import type { GbnfJsonSchema } from "node-llama-cpp";

type Field = readonly [string, GbnfJsonSchema];

const STRING: GbnfJsonSchema = { type: "string" };
const NAMES: GbnfJsonSchema = { type: "array", items: STRING, minItems: 1 };
const OPERATORS: GbnfJsonSchema = { enum: ["=", "==", "!", "!=", "<", "<=", ">", ">=", "range"] };

const buildObject = (fields: readonly Field[]): GbnfJsonSchema => ({ type: "object", properties: Object.fromEntries(fields) });

/**
 * @example
 * listOrderedSubsets(["names", "conditions"]);
 * // → [["names"], ["conditions"], ["names", "conditions"]]
 */
const listOrderedSubsets = <T>(entries: readonly T[]): readonly (readonly T[])[] =>
  Array.from({ length: (2 ** entries.length) - 1 }, (_, mask) => entries.filter((_entry, at) => ((mask + 1) & (2 ** at)) !== 0));

/** One condition name per object, holding `values`. */
const buildConditions = (vocabulary: Vocabulary, values: GbnfJsonSchema): GbnfJsonSchema => ({
  oneOf: vocabulary.conditions.map((condition) => buildObject([[condition, values]])),
});

/** Seeder values: each value with its operator. */
const SEEDER_VALUES: GbnfJsonSchema = { type: "object", additionalProperties: OPERATORS, minProperties: 1 };

/** A removal names values, or `null` to drop the whole condition. */
const REMOVED_VALUES: GbnfJsonSchema = { oneOf: [NAMES, { type: "null" }] };

const buildSeederPatch = (vocabulary: Vocabulary, removal: boolean): GbnfJsonSchema => ({
  oneOf: listOrderedSubsets<Field>([["names", NAMES], ["conditions", buildConditions(vocabulary, removal
    ? REMOVED_VALUES
    : SEEDER_VALUES)]]).map(buildObject),
});

const buildTagSeederPatch = (vocabulary: Vocabulary, removal: boolean): GbnfJsonSchema => ({
  oneOf: listOrderedSubsets<Field>([["conditions", buildConditions(vocabulary, removal
    ? REMOVED_VALUES
    : NAMES)], ["tags", NAMES]]).map(buildObject),
});

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
export function buildFillerSchemas(vocabulary: Vocabulary): Readonly<Record<AgentCommand["type"], GbnfJsonSchema>> {
  const add = buildSeederPatch(vocabulary, false);

  return {
    createCategory: buildObject([["category", STRING]]),
    createSeeder: { oneOf: [buildObject([["category", STRING], ["seeder", STRING]]), buildObject([["category", STRING], ["seeder", STRING], ["add", add]])] },
    deleteCategory: buildObject([["category", STRING]]),
    deleteSeeders: buildObject([["targets", TARGETS]]),
    moveSeeders: buildObject([["targets", TARGETS], ["toCategory", STRING]]),
    rename: buildObject([["target", { enum: ["category", "seeder", "tagSeeder"] }], ["name", STRING], ["to", STRING]]),
    updateSeeders: buildPatched(["targets", TARGETS], add, buildSeederPatch(vocabulary, true)),
    updateSeederTags: buildPatched(["targets", TARGETS], NAMES, NAMES),
    createTagSeeder: buildObject([["name", STRING], ["conditions", buildConditions(vocabulary, NAMES)], ["tags", NAMES]]),
    updateTagSeeder: buildPatched(["name", STRING], buildTagSeederPatch(vocabulary, false), buildTagSeederPatch(vocabulary, true)),
    deleteTagSeeder: buildObject([["name", STRING]]),
  };
}
