import { useMemo, useState, type ReactElement } from "react";
import type { Command, StateCommand } from "../commands.ts";
import type { AgentPlan } from "../panel-api.ts";
import { expandCommand } from "../condition-values.ts";
import type { ConditionValue } from "../types.ts";
import { checkSteps } from "./check-steps.ts";
import { commandViews } from "./command-views.ts";
import { ConditionToggles } from "./condition-toggles.tsx";
import { usePanel } from "./store.ts";

/** Writes a command as the JSON its editor holds. Low, Sonar 0. */
const writeStep = (step: StateCommand): string => JSON.stringify(step, undefined, 2);

/** The agent's last answer, when it could not run, as an editable step. Low, Sonar 1. */
function writeFailedStep(plan: AgentPlan): readonly string[] {
  if (plan.failedStep === undefined) return [];
  try {
    return [JSON.stringify({ type: plan.failedStep.type, ...(JSON.parse(plan.failedStep.answer) as object) }, undefined, 2)];
  } catch {
    return [`{ "type": "${plan.failedStep.type}" }`];
  }
}

/** The values code fills in for a step's added conditions, so unticked ones stay listed. Low, Sonar 1. */
function readFullValues(text: string): Readonly<Record<string, readonly ConditionValue[]>> {
  try {
    const step = expandCommand(JSON.parse(text) as StateCommand) as { readonly add?: { readonly conditions?: Readonly<Record<string, readonly ConditionValue[]>> } };
    return step.add?.conditions ?? {};
  } catch {
    return {};
  }
}

/** Renders a command with its approval view. Low, Sonar 0. */
function StepView({ step }: { readonly step: Command }): ReactElement {
  const View = commandViews[step.type] as (props: { readonly command: Command }) => ReactElement;
  return <View command={step} />;
}

/** Shows the agent's plan: each step editable as JSON, checked on a copy of the state, then approved or dismissed. */
export function PlanDialog({ plan }: { readonly plan: AgentPlan }) {
  const loaded = usePanel((state) => state.loaded);
  const { approvePlan, rejectPlan, dismissPlan } = usePanel.getState();
  const proposed = useMemo(() => [...plan.steps.map(writeStep), ...writeFailedStep(plan)], [plan]);
  const fullValues = useMemo(() => proposed.map(readFullValues), [proposed]);
  const [texts, setTexts] = useState<readonly string[]>(proposed);
  const [stepNotes, setStepNotes] = useState<readonly string[]>(() => proposed.map(() => ""));
  const [planNote, setPlanNote] = useState("");
  const [busy, setBusy] = useState(false);
  const notes = { plan: planNote, steps: stepNotes };

  const start = useMemo(() => ({
    version: loaded?.version ?? "",
    state: loaded?.state ?? "draft" as const,
    categories: plan.start.categories,
    itemData: plan.start.itemData,
    log: [],
    pending: [],
  }), [loaded, plan]);
  const checked = useMemo(() => checkSteps(start, texts), [start, texts]);
  const ready = texts.length > 0 && checked.errors.every((error) => error === undefined);

  const edit = (at: number, text: string) => setTexts(texts.map((old, index) => (index === at
    ? text
    : old)));

  return (
    <div className="scrim">
      <div className="modal plan" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>Agent plan</h3>
          <span className="sp" />
          <span className="pill">{`${plan.model} · ${String(plan.ms)} ms`}</span>
        </div>
        <div className="modal-body plan-body">
          <p className="plan-query">{plan.query}</p>
          <p className="plan-meta">
            {`Names found: ${plan.names.length === 0
              ? "none"
              : plan.names.join(", ")} · agent stopped: ${plan.outcome}`}
          </p>
          {texts.length === 0
            ? <p className="empty">The agent found nothing to do. Add a step, or dismiss.</p>
            : null}
          {texts.map((text, at) => {
            const error = checked.errors[at];
            const step = error === undefined
              ? checked.steps[checked.errors.slice(0, at).filter((earlier) => earlier === undefined).length]
              : undefined;
            return (
              <div className="plan-step" key={at}>
                <div className="plan-step-head">
                  <strong>{`Step ${String(at + 1)}`}</strong>
                  <span className="sp" />
                  <button
                    type="button"
                    className="btn tiny ghost"
                    onClick={() => {
                      setTexts(texts.filter((_old, index) => index !== at));
                      setStepNotes(stepNotes.filter((_old, index) => index !== at));
                    }}
                  >
                    Remove
                  </button>
                </div>
                {step === undefined
                  ? null
                  : <div className="plan-view"><StepView step={step} /></div>}
                {step === undefined
                  ? null
                  : <ConditionToggles step={step} text={text} expanded={fullValues[at] ?? {}} onChange={(next) => edit(at, next)} />}
                <textarea className="mono" spellCheck={false} rows={Math.min(14, text.split("\n").length + 1)} value={text} onChange={(event) => edit(at, event.target.value)} />
                {error === undefined
                  ? null
                  : <p className="plan-error">{error}</p>}
                <input
                  className="plan-note"
                  value={stepNotes[at] ?? ""}
                  placeholder="What did the agent get wrong in this step?"
                  onChange={(event) => setStepNotes(stepNotes.map((old, index) => (index === at
                    ? event.target.value
                    : old)))}
                />
              </div>
            );
          })}
          <button
            type="button"
            className="btn tiny ghost"
            onClick={() => {
              setTexts([...texts, "{\n  \"type\": \"\"\n}"]);
              setStepNotes([...stepNotes, ""]);
            }}
          >
            + Add step
          </button>
          <textarea className="plan-note" rows={2} value={planNote} placeholder="Notes on the whole plan: what should the agent have done?" onChange={(event) => setPlanNote(event.target.value)} />
        </div>
        <div className="modal-foot">
          <span className="sp" />
          <button type="button" className="btn" disabled={busy} title="Close without keeping anything" onClick={dismissPlan}>Dismiss</button>
          <button type="button" className="btn danger" disabled={busy} title="Close and keep this plan as a wrong answer" onClick={() => rejectPlan(notes)}>Reject</button>
          <button
            type="button"
            className="btn primary"
            disabled={!ready || busy}
            onClick={() => {
              setBusy(true);
              void approvePlan(checked.steps, notes).finally(() => setBusy(false));
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
