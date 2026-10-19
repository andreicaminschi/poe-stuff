/** Writes one block of an input: its label, then its lines, or `none`. */
const formatBlock = (label: string, lines: readonly string[]): string =>
  `${label}:\n${lines.length === 0
    ? "none"
    : lines.join("\n")}`;

/**
 * Writes the text the Router and Filler read: the request, what the state holds for the names
 * it mentions, and what this request's earlier steps already did.
 *
 * @example
 * formatInput("Tag Rings as velvet", ["seeder Rings: in Bases"], []);
 * // → "request: Tag Rings as velvet\ncontext:\nseeder Rings: in Bases\ndone:\nnone"
 */
export const formatInput = (request: string, context: readonly string[], done: readonly string[]): string =>
  [`request: ${request}`, formatBlock("context", context), formatBlock("done", done)].join("\n");

/** Writes the text the Filler reads: the Router's input plus the command type it chose. */
export const formatFillerInput = (input: string, type: string): string => `${input}\ncommand: ${type}`;

/** Writes the text the Judge reads: the request, what earlier steps did, and this step's summary. */
export const formatJudgeInput = (request: string, done: readonly string[], step: readonly string[]): string =>
  [`request: ${request}`, formatBlock("done", done), formatBlock("step", step)].join("\n");
