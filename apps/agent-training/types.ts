import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState } from "@poe/panel-state/types";

/** One thing a user might want: the request, the state they had, and the commands that fulfil it. */
export type Goal = {
  readonly kind: string;
  readonly request: string;
  readonly setup: readonly Command[];
  readonly steps: readonly Command[];
};

/** A goal before it is filed under a kind. The kind is the builder's key in the registry, and nowhere else. */
export type GoalDraft = Omit<Goal, "kind">;

/** Builds one goal of one kind from the real state. The seed fixes every random choice. */
export type GoalBuilder = (state: PanelState, seed: number) => GoalDraft;

/** Which goal a row came from, so a later split keeps one goal's rows together. */
type RowSource = { readonly goal: number; readonly kind: string };

/** One Router example: the input text and the label it must pick. */
export type RouterRow = RowSource & { readonly input: string; readonly label: string };

/** One Filler example: the input text and the params JSON it must write. */
export type FillerRow = RowSource & { readonly input: string; readonly output: string };

/** One Judge example: the input text and its verdict. */
export type JudgeRow = RowSource & { readonly input: string; readonly label: "accept" | "complete" | "reject"; readonly mutation?: string };

export type Rows = {
  readonly router: readonly RouterRow[];
  readonly filler: readonly FillerRow[];
  readonly judge: readonly JudgeRow[];
};
