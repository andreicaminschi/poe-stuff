import type { ExampleRows } from "./generate-training/rows/play-example.ts";
import { playExample } from "./generate-training/rows/play-example.ts";
import type { FeedbackRecord } from "./panel-api.ts";

/** Plays one kept interaction as a training example, or undefined when its steps no longer run. Low, Sonar 1. */
function playRecord(record: FeedbackRecord): ExampleRows | undefined {
  const start = { version: "feedback", state: "draft" as const, categories: record.plan.start.categories, itemData: record.plan.start.itemData, log: [], pending: [] };
  try {
    return playExample({ goal: `feedback-${record.verdict}`, form: "single", query: record.plan.query, names: record.plan.names, commands: record.final }, start);
  } catch {
    return undefined;
  }
}

/**
 * Turns approved and edited interactions into stop, choose, fill and request rows, the same
 * shape the generator writes. The final steps are the label, so an edit teaches the
 * correction. Rejected plans carry no right answer and are skipped. Low, Sonar 1.
 */
export function feedbackToRows(records: readonly FeedbackRecord[]): ExampleRows & { readonly skipped: number } {
  const kept = records.filter((record) => record.verdict !== "rejected").map(playRecord);
  const played = kept.filter((rows): rows is ExampleRows => rows !== undefined);

  return {
    stop: played.flatMap((rows) => rows.stop),
    choose: played.flatMap((rows) => rows.choose),
    fill: played.flatMap((rows) => rows.fill),
    request: played.flatMap((rows) => rows.request),
    skipped: records.length - played.length,
  };
}
