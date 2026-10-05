import { objectOf, required, toolSchema, type Field, type JsonSchema } from "../command-schema.ts";
import { TOOL_PARAMS, type ToolType } from "../commands.ts";
import type { ContextEntry } from "../format-context.ts";

/** The one field that says what a command acts on, and the kind of name it takes. */
type KeyField = { readonly key: string; readonly kind: "seeder" | "item" | "category"; readonly inTargets?: true };

/** Commands whose key field is a new name have none: their values cannot be listed. */
const KEY_FIELDS: Readonly<Partial<Record<ToolType, KeyField>>> = {
  updateSeeder: { key: "seeder", kind: "seeder" },
  deleteSeeder: { key: "seeder", kind: "seeder" },
  moveSeeder: { key: "seeder", kind: "seeder" },
  updateItems: { key: "items", kind: "item" },
  updateSeeders: { key: "targets", kind: "category", inTargets: true },
  deleteSeeders: { key: "targets", kind: "category", inTargets: true },
  moveSeeders: { key: "targets", kind: "category", inTargets: true },
  mergeCategory: { key: "category", kind: "category" },
  deleteCategory: { key: "names", kind: "category" },
};

/** Every name of one kind the context mentions, categories included from seeders and items. Low, Sonar 2. */
function listNamesOfKind(entries: readonly ContextEntry[], kind: KeyField["kind"]): readonly string[] {
  const own = entries.filter((entry) => entry.kind === kind).map((entry) => entry.name);
  if (kind !== "category") return own;
  const held = entries.flatMap((entry) => (Array.isArray(entry["categories"])
    ? entry["categories"] as readonly string[]
    : []));
  return [...new Set([...own, ...held])];
}

/** The value an attempt gave its key field. Low, Sonar 1. */
function readKeyValue(field: KeyField, args: Readonly<Record<string, unknown>>): unknown {
  const value = args[field.key];
  if (field.inTargets === true) return (value as { readonly category?: string } | undefined)?.category;
  return Array.isArray(value)
    ? value[0]
    : value;
}

/**
 * The tool schema for the next attempt at `type`: its key field limited to the context's names
 * of that kind, minus the values earlier attempts tried. Undefined when nothing untried is
 * left, or when the key field is a new name that was already tried once. Low, Sonar 3.
 */
export function buildAttemptSchema(type: ToolType, entries: readonly ContextEntry[], tried: readonly Readonly<Record<string, unknown>>[]): JsonSchema | undefined {
  const params: Readonly<Record<string, Field<boolean>>> = TOOL_PARAMS[type];
  const field = KEY_FIELDS[type];
  if (field === undefined) return tried.length === 0
    ? toolSchema(params)
    : undefined;

  const used = new Set(tried.map((args) => readKeyValue(field, args)));
  const allowed = listNamesOfKind(entries, field.kind).filter((name) => !used.has(name));
  if (allowed.length === 0) return undefined;

  const names: JsonSchema = { enum: allowed };
  const original = params[field.key]!;
  const limited: Field<boolean> = field.inTargets === true
    ? { ...original, schema: objectOf({ category: required(names) }) }
    : { ...original, schema: names };

  return toolSchema({ ...params, [field.key]: limited });
}
