import type { Command } from "@poe/panel-state/execute-command";
import { z } from "zod";

const name = z.string().trim().min(1).max(200);
const names = z.array(name).min(1).max(500);
const literal = z.union([z.string().max(200), z.number(), z.boolean()]);
const values = z.union([z.string().min(1).max(100), z.array(literal).min(1).max(500)]);

const targets = z.strictObject({
  categories: names.optional(),
  seeders: names.optional(),
  except: names.optional(),
}).refine((value) => value.categories !== undefined || value.seeders !== undefined, "Targets name no categories or seeders.");

const seederPatch = z.strictObject({
  tags: names.optional(),
  knownItems: names.optional(),
  conditions: z.record(name, values).optional(),
});

const seederRemoval = z.strictObject({
  tags: names.optional(),
  knownItems: names.optional(),
  conditions: z.record(name, values.nullable()).optional(),
});

const itemPatch = z.strictObject({ tags: names.optional(), knownItems: names.optional() });

/** Every command a renderer or an agent may send. Unknown keys are refused, not dropped. */
export const COMMAND_SCHEMA = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("createCategory"), category: name }),
  z.strictObject({ type: z.literal("rename"), target: z.enum(["category", "seeder"]), name, to: name }),
  z.strictObject({ type: z.literal("deleteCategory"), category: name }),
  z.strictObject({ type: z.literal("mergeCategory"), category: name, into: name }),
  z.strictObject({ type: z.literal("createSeeder"), category: name, seeder: name, add: seederPatch.optional() }),
  z.strictObject({ type: z.literal("updateSeeders"), targets, add: seederPatch.optional(), remove: seederRemoval.optional() }),
  z.strictObject({ type: z.literal("moveSeeders"), targets, toCategory: name }),
  z.strictObject({ type: z.literal("deleteSeeders"), targets }),
  z.strictObject({ type: z.literal("updateItems"), items: names, add: itemPatch.optional(), remove: itemPatch.optional() }),
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
