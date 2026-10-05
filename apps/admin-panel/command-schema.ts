/** The JSON schema subset node-llama-cpp turns into a grammar. */
export type JsonSchema =
  | { readonly type: "string" | "number" | "boolean" }
  | { readonly enum: readonly string[] }
  | { readonly oneOf: readonly JsonSchema[] }
  | { readonly type: "array"; readonly items?: JsonSchema; readonly prefixItems?: readonly JsonSchema[]; readonly minItems?: number; readonly maxItems?: number }
  | { readonly type: "object"; readonly properties?: Readonly<Record<string, JsonSchema>>; readonly required?: readonly string[]; readonly additionalProperties?: boolean | JsonSchema };

/**
 * One command field: its schema as the agent writes it, and whether the command type requires
 * it. `toolKey` marks a list the agent fills with one value, under that singular key.
 */
export type Field<Required extends boolean> = { readonly schema: JsonSchema; readonly required: Required; readonly toolKey?: string };

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

/** A command list the agent fills with one text, under `toolKey`. Low, Sonar 0. */
export const single = (toolKey: string): Field<true> => ({ schema: TEXT, required: true, toolKey });

type Fields = Readonly<Record<string, Field<boolean>>>;

/** The fields under the keys the agent writes. Low, Sonar 0. */
export const toolFields = (params: Fields): Fields =>
  Object.fromEntries(Object.entries(params).map(([key, field]) => [field.toolKey ?? key, field]));

/** A command's args as the agent writes them: each single list as its one value. Low, Sonar 1. */
export const toToolArgs = (params: Fields, args: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> =>
  Object.fromEntries(Object.entries(args).map(([key, value]) => {
    const toolKey = params[key]?.toolKey;
    return toolKey === undefined
      ? [key, value]
      : [toolKey, (value as readonly unknown[])[0]];
  }));

/** The agent's args as the command takes them: each single value back in its list. Low, Sonar 1. */
export function toCommandArgs(params: Fields, args: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const keys = new Map(Object.entries(params).flatMap(([key, field]) => (field.toolKey === undefined
    ? []
    : [[field.toolKey, key] as const])));

  return Object.fromEntries(Object.entries(args).map(([key, value]) => {
    const commandKey = keys.get(key);
    return commandKey === undefined
      ? [key, value]
      : [commandKey, [value]];
  }));
}

export const SEEDER_PATCH: JsonSchema = objectOf({ conditions: optional(CONDITIONS), knownItems: optional(TEXT_LIST), tags: optional(TEXT_LIST) });

export const ITEM_PATCH: JsonSchema = objectOf({ knownItems: optional(TEXT_LIST), tags: optional(TEXT_LIST) });

export const SEEDER_TARGETS: JsonSchema = { oneOf: [objectOf({ category: required(TEXT) }), objectOf({ seeders: required(TEXT_LIST) })] };

/** Every subset of `keys`, each in the order given. Low, Sonar 1. */
const listSubsets = (keys: readonly string[]): readonly (readonly string[])[] =>
  keys.reduce<readonly (readonly string[])[]>((subsets, key) => [...subsets, ...subsets.map((subset) => [...subset, key])], [[]]);

/**
 * The same schema with optional keys spelled out as one object per allowed key set: the
 * grammar writes every listed property, so an optional one must be its own branch. An object
 * with no required keys never comes out empty. Low, Sonar 3.
 */
export function expandOptional(schema: JsonSchema): JsonSchema {
  if ("oneOf" in schema) return { oneOf: schema.oneOf.map(expandOptional) };
  if (!("type" in schema)) return schema;
  if (schema.type === "array") return schema.items === undefined
    ? schema
    : { ...schema, items: expandOptional(schema.items) };
  if (schema.type !== "object" || schema.properties === undefined) return schema;
  const properties = schema.properties;
  const required = new Set(schema.required ?? []);
  const keys = Object.keys(properties);
  const sets = listSubsets(keys.filter((key) => !required.has(key)))
    .map((optional) => keys.filter((key) => required.has(key) || optional.includes(key)))
    .filter((set) => set.length > 0);
  const variants = sets.map((set): JsonSchema => ({
    type: "object",
    properties: Object.fromEntries(set.map((key) => [key, expandOptional(properties[key]!)])),
    required: set,
    additionalProperties: false,
  }));

  return variants.length === 1
    ? variants[0]!
    : { oneOf: variants };
}

/** A command's params, or a refusal with a fixed reason, as the grammar needs it. Low, Sonar 0. */
export const toolSchema = (params: Fields): JsonSchema =>
  expandOptional({ oneOf: [objectOf(toolFields(params)), objectOf({ refuse: required({ enum: REFUSALS }) })] });

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
