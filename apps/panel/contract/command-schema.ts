import type { Command } from "@poe/panel-state/execute-command";
import { z } from "zod";

const name = z.string().trim().min(1).max(200);
const names = z.array(name).min(1).max(500);
const operator = z.enum(["=", "==", "!", "!=", "<", "<=", ">", ">=", "range"]);
const values = z.record(z.string().trim().min(1).max(200), operator);
const valueNames = z.array(z.string().trim().min(1).max(200)).min(1).max(500);
const split = z.record(name, z.boolean());
const price = z.strictObject({ provider: z.enum(["poewatch"]), id: name });

const targets = z.strictObject({
  categories: names.optional(),
  seeders: names.optional(),
  except: names.optional(),
}).refine((value) => value.categories !== undefined || value.seeders !== undefined, "Targets name no categories or seeders.");

const seederPatch = z.strictObject({
  names: names.optional(),
  conditions: z.record(name, values).optional(),
  split: split.optional(),
});

const seederRemoval = z.strictObject({
  names: names.optional(),
  conditions: z.record(name, valueNames.nullable()).optional(),
  split: names.optional(),
});

const itemPatch = z.strictObject({ prices: z.array(price).min(1).max(500).optional() });

const tagSeederPatch = z.strictObject({
  conditions: z.record(name, valueNames).optional(),
  tags: names.optional(),
});

const tagSeederRemoval = z.strictObject({
  conditions: z.record(name, valueNames.nullable()).optional(),
  tags: names.optional(),
});

/** Every command a renderer or an agent may send. Unknown keys are refused, not dropped. */
export const COMMAND_SCHEMA = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("createCategory"), category: name }),
  z.strictObject({ type: z.literal("rename"), target: z.enum(["category", "seeder", "tagSeeder"]), name, to: name }),
  z.strictObject({ type: z.literal("deleteCategory"), category: name }),
  z.strictObject({ type: z.literal("createSeeder"), category: name, seeder: name, add: seederPatch.optional() }),
  z.strictObject({ type: z.literal("updateSeeders"), targets, add: seederPatch.optional(), remove: seederRemoval.optional() }),
  z.strictObject({ type: z.literal("moveSeeders"), targets, toCategory: name }),
  z.strictObject({ type: z.literal("deleteSeeders"), targets }),
  z.strictObject({ type: z.literal("updateSeederTags"), targets, add: names.optional(), remove: names.optional() }),
  z.strictObject({ type: z.literal("createTagSeeder"), name, conditions: z.record(name, valueNames), tags: names }),
  z.strictObject({ type: z.literal("updateTagSeeder"), name, add: tagSeederPatch.optional(), remove: tagSeederRemoval.optional() }),
  z.strictObject({ type: z.literal("deleteTagSeeder"), name }),
  z.strictObject({ type: z.literal("updateItem"), item: z.string().min(1).max(4000), add: itemPatch.optional(), remove: itemPatch.optional() }),
]);

// fails typecheck if the lib's union drifts
type Parsed = z.infer<typeof COMMAND_SCHEMA>;
type Assert<T extends true> = T;
export type CommandSchemaFits = Assert<Parsed extends Command
  ? true
  : false>;
export type CommandSchemaCovers = Assert<Command["type"] extends Parsed["type"]
  ? true
  : false>;
