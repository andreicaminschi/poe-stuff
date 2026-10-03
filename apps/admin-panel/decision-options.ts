import type { StateCommand } from "./commands.ts";

/** The decision model's way out: it does not know what to do, so it asks the user to rephrase. */
export const REPHRASE = "rephrase";

/** Everything the decision model can pick as the next step. */
export type DecisionOption = StateCommand["type"] | typeof REPHRASE;
