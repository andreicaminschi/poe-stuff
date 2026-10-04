/** The JSON schema subset node-llama-cpp turns into a grammar. */
export type JsonSchema =
  | { readonly type: "string" | "number" | "boolean" }
  | { readonly enum: readonly string[] }
  | { readonly oneOf: readonly JsonSchema[] }
  | { readonly type: "array"; readonly items?: JsonSchema; readonly prefixItems?: readonly JsonSchema[]; readonly minItems?: number; readonly maxItems?: number }
  | { readonly type: "object"; readonly properties?: Readonly<Record<string, JsonSchema>>; readonly required?: readonly string[]; readonly additionalProperties?: boolean | JsonSchema };

/** One command field: its schema, and whether the command type requires it. */
export type Field<Required extends boolean> = { readonly schema: JsonSchema; readonly required: Required };

/** A field per command key, required exactly when the command type requires it. */
export type Params<C> = { readonly [K in Exclude<keyof C, "type">]-?: Field<undefined extends C[K] ? false : true> };

export const REFUSALS = ["missing-target", "missing-value"] as const;

export type Refusal = (typeof REFUSALS)[number];

export const TEXT: JsonSchema = { type: "string" };

export const TEXT_LIST: JsonSchema = { type: "array", items: TEXT, minItems: 1 };

/** The agent writes one sentinel per condition; code expands it into values. */
const CONDITIONS: JsonSchema = { type: "object", additionalProperties: TEXT };

/** An object whose keys come out sorted, as training writes them. Low, Sonar 1. */
export function objectOf(fields: Readonly<Record<string, Field<boolean>>>): JsonSchema {
  const keys = Object.keys(fields).sort();

  return {
    type: "object",
    properties: Object.fromEntries(keys.map((key) => [key, fields[key]!.schema])),
    required: keys.filter((key) => fields[key]!.required),
    additionalProperties: false,
  };
}

export const optional = (schema: JsonSchema): Field<false> => ({ schema, required: false });

export const required = (schema: JsonSchema): Field<true> => ({ schema, required: true });

export const SEEDER_PATCH: JsonSchema = objectOf({ conditions: optional(CONDITIONS), knownItems: optional(TEXT_LIST), tags: optional(TEXT_LIST) });

export const ITEM_PATCH: JsonSchema = objectOf({ knownItems: optional(TEXT_LIST), tags: optional(TEXT_LIST) });

export const SEEDER_TARGETS: JsonSchema = { oneOf: [objectOf({ category: required(TEXT) }), objectOf({ seeders: required(TEXT_LIST) })] };

/** A command's params, or a refusal with a fixed reason. Low, Sonar 0. */
export const toolSchema = (fields: Readonly<Record<string, Field<boolean>>>): JsonSchema =>
  ({ oneOf: [objectOf(fields), objectOf({ refuse: required({ enum: REFUSALS }) })] });

/** Writes a schema as the short field list the filler's prompt shows. Low, Sonar 3. */
export function describeSchema(schema: JsonSchema): string {
  if ("enum" in schema) return schema.enum.join(" | ");
  if ("oneOf" in schema) return schema.oneOf.map(describeSchema).join(" or ");
  if (schema.type === "array") return schema.prefixItems === undefined
    ? `list of ${describeSchema(schema.items ?? TEXT)}`
    : `[${schema.prefixItems.map(describeSchema).join(", ")}]`;
  if (schema.type === "object") return describeObject(schema);
  if (schema.type === "string") return "text";
  return schema.type;
}

/** `{key: …, key?: …}`, or a map when the keys are free. Low, Sonar 2. */
function describeObject(schema: Extract<JsonSchema, { readonly type: "object" }>): string {
  if (schema.properties === undefined) return `map of ${typeof schema.additionalProperties === "object"
    ? describeSchema(schema.additionalProperties)
    : "anything"}`;
  const required = new Set(schema.required ?? []);

  return `{${Object.entries(schema.properties).map(([key, value]) => `${key}${required.has(key)
    ? ""
    : "?"}: ${describeSchema(value)}`).join(", ")}}`;
}
