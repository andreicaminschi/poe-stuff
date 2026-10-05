import { CONDITION_FORMATS } from "../../condition-values.ts";
import { formatContext } from "../../format-context.ts";
import type { PanelState } from "../../types.ts";
import type { Example } from "../example.ts";
import type { RequestInput, Row } from "./play-example.ts";

export type Entry = "single" | "multi" | "bulk";
export type Intent = "single" | "multi";

/** How many entries a request edits. */
export type EntryRow = Row<RequestInput, { readonly entry: Entry }>;

/** How many actions a request asks for. */
export type IntentRow = Row<RequestInput, { readonly intent: Intent }>;

/** Listed names several entries by hand; bulk edits a whole group. Low, Sonar 1. */
function readEntry(form: string): Entry {
  if (form === "listed") return "multi";
  if (form === "bulk") return "bulk";
  return "single";
}

const readInput = (example: Example, start: PanelState): RequestInput => ({ query: example.query, context: formatContext(start, CONDITION_FORMATS, example.names) });

/** Labels one request's entry, on the panel it starts from. Low, Sonar 0. */
export const entryRow = (example: Example, start: PanelState): EntryRow =>
  ({ input: readInput(example, start), output: { entry: readEntry(example.form) }, meta: { goal: example.goal, form: example.form } });

/** Labels one request's intent, on the panel it starts from. Low, Sonar 0. */
export const intentRow = (example: Example, start: PanelState): IntentRow => ({
  input: readInput(example, start),
  output: {
    intent: example.goal === "twoStep"
      ? "multi"
      : "single",
  },
  meta: { goal: example.goal, form: example.form },
});
