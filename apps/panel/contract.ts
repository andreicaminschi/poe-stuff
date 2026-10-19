import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState } from "@poe/panel-state/types";
import { z } from "zod";
import type { ChannelName } from "./contract/channels.ts";
import { COMMAND_SCHEMA } from "./contract/command-schema.ts";
import type { VersionSummary } from "./version-store.ts";

/** What the renderer sees of the open version. */
export type PanelView = {
  readonly version: string;
  readonly published: boolean;
  readonly state: PanelState;
  readonly pending: number;
  readonly undoable: string | undefined;
};

/** One exported training run the agent can load. */
export type ModelRun = { readonly run: string; readonly exportedAt: string };

/** How a plan ended. */
export type PlanOutcome =
  | "complete"
  | "already-done"
  | "rephrase"
  | "rejected"
  | "invalid-params"
  | "command-failed"
  | "step-limit";

/** One step the agent proposes, with what each model said about it. */
export type PlanStep = {
  readonly command: Command;
  readonly summary: readonly string[];
  readonly verdict: "accept" | "complete" | "reject";
  readonly ms: number;
};

/** A proposal. Nothing in it has touched the real state. */
export type AgentPlan = {
  readonly id: string;
  readonly request: string;
  readonly run: string;
  readonly version: string;
  readonly steps: readonly PlanStep[];
  readonly outcome: PlanOutcome;
  readonly detail: string | undefined;
  readonly ms: number;
};

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const text = (max: number) => z.string().max(max);

export const NOTES_SCHEMA = z.strictObject({ plan: text(4000), steps: z.array(text(4000)).max(50) });

export type Notes = z.infer<typeof NOTES_SCHEMA>;

/** Every channel: its input schema, and the type it answers with. */
export const CHANNELS = {
  "panel:view": { input: z.tuple([]) },
  "panel:versions": { input: z.tuple([]) },
  "panel:open": { input: z.tuple([text(40).regex(/^\d+(\.\d+)*$/)]) },
  "panel:dispatch": { input: z.tuple([COMMAND_SCHEMA]) },
  "panel:undo": { input: z.tuple([]) },
  "panel:save": { input: z.tuple([]) },
  "agent:models": { input: z.tuple([]) },
  "agent:plan": { input: z.tuple([text(1000).trim().min(1), text(100).regex(/^[\w.-]+$/)]) },
  "agent:approve": { input: z.tuple([z.uuid(), z.array(COMMAND_SCHEMA).max(20), NOTES_SCHEMA]) },
  "agent:reject": { input: z.tuple([z.uuid(), NOTES_SCHEMA]) },
  "agent:dismiss": { input: z.tuple([z.uuid()]) },
} as const satisfies Readonly<Record<ChannelName, { readonly input: z.ZodType }>>;

export type Channel = keyof typeof CHANNELS;

export type Outputs = {
  readonly "panel:view": PanelView;
  readonly "panel:versions": readonly VersionSummary[];
  readonly "panel:open": PanelView;
  readonly "panel:dispatch": PanelView;
  readonly "panel:undo": PanelView;
  readonly "panel:save": PanelView;
  readonly "agent:models": readonly ModelRun[];
  readonly "agent:plan": AgentPlan;
  readonly "agent:approve": PanelView;
  readonly "agent:reject": null;
  readonly "agent:dismiss": null;
};

type DeepReadonly<T> = T extends readonly unknown[]
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// lets the lib's readonly Command through
export type Inputs = { readonly [K in Channel]: DeepReadonly<z.input<(typeof CHANNELS)[K]["input"]>> };

/** The bridge `window.panel` exposes: one function per channel, never throwing. */
export type PanelApi = { readonly [K in Channel]: (...args: Inputs[K]) => Promise<Result<Outputs[K]>> };
