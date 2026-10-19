import { randomUUID } from "node:crypto";
import type { Command } from "@poe/panel-state/execute-command";
import type { Lake } from "@poe/lake/types";
import type { Agent } from "./agent.ts";
import type { StepTrace } from "./agent/run-steps.ts";
import type { AgentPlan, Notes, PanelView } from "./contract.ts";
import type { Logger } from "./logger.ts";
import { findUndoable, runAll, runCommand, undoLast, type Actor, type Session, type Stamp } from "./session.ts";
import type { VersionStore } from "./version-store.ts";

export type FeedbackVerdict = "accepted" | "edited" | "rejected";

/** One reviewed plan, kept for training. */
export type FeedbackRecord = {
  readonly id: string;
  readonly at: string;
  readonly plan: AgentPlan;
  readonly trace: readonly StepTrace[];
  readonly final: readonly Command[];
  readonly verdict: FeedbackVerdict;
  readonly notes: Notes;
};

type KeptPlan = { readonly plan: AgentPlan; readonly trace: readonly StepTrace[] };

export type Dispatcher = ReturnType<typeof createDispatcher>;

const stampOf = (actor: Actor): Stamp => ({ id: randomUUID(), at: new Date().toISOString(), actor });

/** Writes the view the renderer sees of a session. */
function viewOf(session: Session): PanelView {
  const undoable = findUndoable([...session.saved, ...session.pending]);
  return {
    version: session.version,
    published: session.published,
    state: session.state,
    pending: session.pending.length,
    undoable: undoable === undefined
      ? undefined
      : undoable.command.type,
  };
}

/**
 * The one owner of the open session. Every change runs here, one at a time, whether the UI or an
 * approved plan asked for it. Plans are kept here too, so feedback records the plan the agent
 * really proposed and not whatever a renderer sends back.
 */
export function createDispatcher(store: VersionStore, agent: Agent, lake: Lake, logger: Logger) {
  let session: Session | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const plans = new Map<string, KeptPlan>();

  function serial<T>(step: () => Promise<T>): Promise<T> {
    const result = queue.then(step);
    queue = result.catch(() => undefined);
    return result;
  }

  async function requireSession(): Promise<Session> {
    session ??= await store.open();
    return session;
  }

  function takePlan(id: string): KeptPlan {
    const kept = plans.get(id);
    if (kept === undefined) throw new Error("That plan is gone. Ask the agent again.");
    plans.delete(id);
    return kept;
  }

  async function writeFeedback(kept: KeptPlan, final: readonly Command[], verdict: FeedbackVerdict, notes: Notes): Promise<void> {
    const at = new Date().toISOString();
    const record: FeedbackRecord = { id: randomUUID(), at, plan: kept.plan, trace: kept.trace, final, verdict, notes };
    // old shape lives in admin-panel/
    await lake.writeJson(`panel/agent-feedback/${at.replaceAll(":", "-")}-${record.id}.json`, record);
    logger.log("info", "feedback.kept", { plan: kept.plan.id, verdict });
  }

  return {
    view: () => serial(async () => viewOf(await requireSession())),

    versions: () => store.list(),

    open: (version: string) => serial(async () => {
      const current = await requireSession();
      if (current.pending.length > 0) throw new Error("Save or undo the unsaved edits before opening another version.");
      session = await store.open(version);
      logger.log("info", "version.opened", { version });
      return viewOf(session);
    }),

    dispatch: (command: Command) => serial(async () => {
      session = runCommand(await requireSession(), command, stampOf("user"));
      logger.log("info", "command.ran", { command });
      return viewOf(session);
    }),

    undo: () => serial(async () => {
      session = undoLast(await requireSession(), stampOf("user"));
      logger.log("info", "command.undone", { entry: session.pending.at(-1)?.command });
      return viewOf(session);
    }),

    save: () => serial(async () => {
      const before = await requireSession();
      session = await store.save(before);
      logger.log("info", "version.saved", { from: before.version, to: session.version, entries: before.pending.length });
      return viewOf(session);
    }),

    listModels: () => agent.listModels(),

    plan: (request: string, run: string) => serial(async () => {
      const current = await requireSession();
      const started = performance.now();
      const result = await agent.plan(current.state, request, run);
      const plan: AgentPlan = {
        id: randomUUID(),
        request,
        run,
        version: current.version,
        steps: result.steps,
        outcome: result.outcome,
        detail: result.detail,
        ms: Math.round(performance.now() - started),
      };

      plans.set(plan.id, { plan, trace: result.trace });
      logger.log("info", "agent.planned", { plan: plan.id, request, run, outcome: plan.outcome, steps: plan.steps.length, ms: plan.ms, trace: result.trace });
      return plan;
    }),

    approve: (id: string, final: readonly Command[], notes: Notes) => serial(async () => {
      const kept = plans.get(id);
      if (kept === undefined) throw new Error("That plan is gone. Ask the agent again.");
      const current = await requireSession();
      if (kept.plan.version !== current.version) throw new Error(`The plan was made on ${kept.plan.version}, but ${current.version} is open.`);

      session = runAll(current, final, () => stampOf("agent"));
      takePlan(id);
      const proposed = kept.plan.steps.map((step) => step.command);
      await writeFeedback(kept, final, JSON.stringify(final) === JSON.stringify(proposed)
        ? "accepted"
        : "edited", notes);
      return viewOf(session);
    }),

    reject: (id: string, notes: Notes) => serial(async () => {
      await writeFeedback(takePlan(id), [], "rejected", notes);
      return null;
    }),

    dismiss: (id: string) => serial(async () => {
      plans.delete(id);
      return null;
    }),
  };
}
