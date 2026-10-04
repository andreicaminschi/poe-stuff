import { CONDITION_FORMATS } from "../condition-values.ts";
import { formatContext } from "../format-context.ts";
import type { PanelState } from "../types.ts";
import type { Example } from "./example.ts";

export type Entry = "single" | "multi" | "bulk";
export type Intent = "single" | "multi";

type RequestBase = { readonly goal: string; readonly form: string; readonly query: string; readonly context: string };

/** How many entries a request edits. */
export type EntryRow = RequestBase & { readonly entry: Entry };

/** How many actions a request asks for. */
export type IntentRow = RequestBase & { readonly intent: Intent };

/** Listed names several entries by hand; bulk edits a whole group. Low, Sonar 1. */
function readEntry(form: string): Entry {
  if (form === "listed") return "multi";
  if (form === "bulk") return "bulk";
  return "single";
}

const describeRequest = (example: Example, start: PanelState): RequestBase => ({
  goal: example.goal,
  form: example.form,
  query: example.query,
  context: formatContext(start, CONDITION_FORMATS, example.names),
});

/** Labels one request's entry, on the panel it starts from. Low, Sonar 0. */
export const entryRow = (example: Example, start: PanelState): EntryRow => ({ ...describeRequest(example, start), entry: readEntry(example.form) });

/** Labels one request's intent, on the panel it starts from. Low, Sonar 0. */
export const intentRow = (example: Example, start: PanelState): IntentRow => ({
  ...describeRequest(example, start),
  intent: example.goal === "twoStep"
    ? "multi"
    : "single",
});
