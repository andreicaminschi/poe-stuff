import type { ZodError } from "zod";
import { bronzeKey } from "./lake/keys.ts";
import { BRONZE_SCHEMAS } from "./validate-bronze/schemas.ts";
import type { Step } from "./types.ts";

/** How many problems are worth printing before the list stops helping. */
const SHOWN_ISSUES = 5;

/** A parse failure as a path and a reason per line, so the broken field is readable. */
function describe(error: ZodError): string {
  const lines = error.issues
    .slice(0, SHOWN_ISSUES)
    .map((issue) => `  ${issue.path.join(".") || "<root>"}: ${issue.message}`);

  const rest = error.issues.length - lines.length;

  return rest > 0
    ? `${lines.join("\n")}\n  ...and ${rest} more`
    : lines.join("\n");
}

/**
 * Reads back what the extract steps wrote and refuses to let a bad payload go further.
 *
 * **It runs after the writes rather than inside them.** Bad bytes on disk are harmless:
 * the stage throws before its manifest entry is written, so nothing downstream will read a
 * stage that never completed and the next run collects over the top of it. What that buys
 * is a validator that checks what is actually stored, and one that can be re-run alone.
 *
 * A replay skips bronze entirely, so it skips this too — the files it reuses were validated
 * by the run that fetched them.
 */
export const validateBronze: Step = {
  id: "validate-bronze",
  stage: "bronze",

  async run({ lake, runId }) {
    for (const { file, schema } of BRONZE_SCHEMAS) {
      const key = bronzeKey(runId, file);
      const parsed = schema.safeParse(await lake.readJson(key));

      if (!parsed.success) {
        throw new Error(`${key} is not valid bronze:\n${describe(parsed.error)}`);
      }
    }

    // Writes nothing: what it produces is the right to carry on.
    return { keys: [], rows: BRONZE_SCHEMAS.length };
  },
};
