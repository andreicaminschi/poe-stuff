import { describeSchema, objectOf, toolFields, toolSchema, type JsonSchema } from "./command-schema.ts";
import { TOOL_PARAMS, type ToolType } from "./commands.ts";

/** One tool: the grammar's schema, and the field list the filler's prompt shows. */
export type Tool = { readonly schema: JsonSchema; readonly fields: string };

/** Every tool, by command type. Low, Sonar 0. */
export const listTools = (): Readonly<Record<ToolType, Tool>> =>
  Object.fromEntries(Object.entries(TOOL_PARAMS).map(([type, params]) => [type, { schema: toolSchema(params), fields: describeSchema(objectOf(toolFields(params))) }])) as Readonly<Record<ToolType, Tool>>;
