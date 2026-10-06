import type { PlayedGoal } from "../build-goals.ts";

/** Writes one block of an input: its label, then its lines, or `none`. */
const formatBlock = (label: string, lines: readonly string[]): string =>
  `${label}:\n${lines.length === 0
    ? "none"
    : lines.join("\n")}`;

/** Lists the summary lines of the steps a goal already took before step `at`. */
export const listDoneLines = (goal: PlayedGoal, at: number): readonly string[] =>
  goal.played.slice(0, at).flatMap((step) => step.lines);

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

/** Writes the text the Judge reads: the request, what earlier steps did, and this step's summary. */
export const formatJudgeInput = (request: string, done: readonly string[], step: readonly string[]): string =>
  [`request: ${request}`, formatBlock("done", done), formatBlock("step", step)].join("\n");
