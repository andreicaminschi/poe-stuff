import type { Command, StateCommand } from "./commands.ts";
import type { Category, ItemData, ManifestEntry, PanelState, WalEntry } from "./types.ts";

export type LoadedVersion = {
  readonly version: string;
  readonly state: ManifestEntry["state"];
  readonly categories: readonly Category[];
  readonly log: readonly WalEntry[];
};

/** What the agent proposes for one instruction. Nothing in it has run on the real state. */
export type AgentPlan = {
  readonly query: string;
  readonly names: readonly string[];
  readonly start: { readonly categories: readonly Category[]; readonly itemData: readonly ItemData[] };
  readonly steps: readonly StateCommand[];
  readonly failedStep: { readonly type: StateCommand["type"]; readonly answer: string } | undefined;
  readonly outcome: string;
  readonly model: string;
  readonly ms: number;
};

export type FeedbackVerdict = "approved" | "edited" | "dismissed";

/** One interaction with the agent, kept as training data. */
export type FeedbackRecord = {
  readonly id: string;
  readonly at: string;
  readonly plan: AgentPlan;
  readonly final: readonly StateCommand[];
  readonly verdict: FeedbackVerdict;
};

export type PanelApi = {
  readonly load: () => Promise<PanelState>;
  readonly dispatch: (command: Command) => Promise<PanelState>;
  readonly plan: (query: string) => Promise<AgentPlan>;
  readonly feedback: (record: FeedbackRecord) => Promise<void>;
};

export const LOAD = "load";
export const DISPATCH = "dispatch";
export const PLAN = "plan";
export const FEEDBACK = "feedback";
