import type { Verb } from "@poe/filter-style/types";

export type VerbCopy = { readonly verb: Verb; readonly head: string; readonly what: string; readonly use: string };

export const VERB_COPY: readonly VerbCopy[] = [
  {
    verb: "take",
    head: "Take",
    what: "worth the tier as it lies",
    use: "The filter can describe the item on the ground, so its worth is settled before the player touches it.",
  },
  {
    verb: "check",
    head: "Check",
    what: "identifying it could reach the tier",
    use: "The item is one thing on the floor and several after identification, and no condition separates them. A unique on a Heavy Belt lies at 1c and could be a Mageblood.",
  },
  {
    verb: "gamble",
    head: "Gamble",
    what: "corrupting it could reach the tier",
    use: "The item is worth the tier only after a Vaal Orb, and the outcome is up to the player.",
  },
];
