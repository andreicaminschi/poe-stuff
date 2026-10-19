import type { Command } from "@poe/panel-state/execute-command";

export type ParsedCommand = { readonly command: Command; readonly error: undefined } | { readonly command: undefined; readonly error: string };

/** Reads an edited command back; the main process validates it fully. */
export function parseCommandText(text: string): ParsedCommand {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { command: undefined, error: String(error) };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { command: undefined, error: "Not a JSON object." };
  if (typeof (value as { type?: unknown }).type !== "string") return { command: undefined, error: "Missing a string \"type\" field." };
  return { command: value as Command, error: undefined };
}
