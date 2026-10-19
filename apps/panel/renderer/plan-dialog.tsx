import { useEffect, useState } from "react";
import type { PlanOutcome, PlanStep } from "../contract.ts";
import { parseCommandText } from "./parse-command-text.ts";
import { usePanel } from "./store.ts";

type StepDraft = { readonly included: boolean; readonly text: string; readonly note: string };

const MESSAGE_OUTCOMES: readonly PlanOutcome[] = ["already-done", "rephrase", "invalid-params", "command-failed"];

const OUTCOME_MESSAGES: Readonly<Record<PlanOutcome, string>> = {
  complete: "The agent finished the request.",
  "already-done": "The state already does what was asked.",
  rephrase: "The agent could not tell what to do. Rephrase the request.",
  rejected: "The Judge rejected a step.",
  "invalid-params": "The agent produced parameters that do not fit the command.",
  "command-failed": "A proposed command failed on the state.",
  "step-limit": "The agent hit its step limit.",
};

const draftStep = (step: PlanStep): StepDraft => ({
  included: step.verdict !== "reject",
  text: JSON.stringify(step.command, null, 2),
  note: "",
});

function StepCard({ index, step, draft, onChange }: {
  readonly index: number;
  readonly step: PlanStep;
  readonly draft: StepDraft;
  readonly onChange: (draft: StepDraft) => void;
}) {
  const { error } = parseCommandText(draft.text);
  const classNames = ["plan-step"];
  if (step.verdict === "reject") classNames.push("rejected");
  if (!draft.included) classNames.push("excluded");

  return (
    <section className={classNames.join(" ")}>
      <label className="plan-step-head">
        <input type="checkbox" checked={draft.included} onChange={(event) => onChange({ ...draft, included: event.target.checked })} />
        <span className="mono">{`#${String(index + 1)}`}</span>
        <strong className="mono">{step.command.type}</strong>
        <span className={`verdict ${step.verdict}`}>{step.verdict}</span>
        <span className="sp" />
        <span className="pill mono">{`${String(Math.round(step.ms))} ms`}</span>
      </label>
      <ul className="plan-summary">
        {step.summary.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <textarea
        className={error === undefined
          ? "plan-json"
          : "plan-json invalid"}
        spellCheck={false}
        value={draft.text}
        onChange={(event) => onChange({ ...draft, text: event.target.value })}
      />
      {error === undefined
        ? null
        : <p className="plan-error">{error}</p>}
      <input className="plan-note" placeholder="Note on this step" value={draft.note} onChange={(event) => onChange({ ...draft, note: event.target.value })} />
    </section>
  );
}

export function PlanDialog() {
  const plan = usePanel((state) => state.plan);
  const busy = usePanel((state) => state.busy);
  const { approve, reject, dismiss } = usePanel.getState();
  const [drafts, setDrafts] = useState<readonly StepDraft[]>(() => (plan?.steps ?? []).map(draftStep));
  const [planNote, setPlanNote] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      void usePanel.getState().dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (plan === undefined) return null;

  const messageOnly = plan.steps.length === 0 && MESSAGE_OUTCOMES.includes(plan.outcome);
  const notes = { plan: planNote, steps: drafts.map((draft) => draft.note) };
  const includedCommands = drafts.filter((draft) => draft.included).map((draft) => parseCommandText(draft.text).command);
  const validCommands = includedCommands.flatMap((command) => (command === undefined
    ? []
    : [command]));
  const canAccept = !busy && validCommands.length > 0 && validCommands.length === includedCommands.length;
  const changeDraft = (index: number, draft: StepDraft): void => setDrafts(drafts.map((entry, at) => (at === index
    ? draft
    : entry)));

  return (
    <div className="backdrop">
      <div className="modal wide" role="dialog" aria-modal="true">
        <h2>{plan.request}</h2>
        <div className="plan-meta">
          <span className="pill mono">{plan.run}</span>
          <span className="pill">{plan.outcome}</span>
          <span className="pill mono">{`${String(Math.round(plan.ms))} ms`}</span>
        </div>
        <p className="plan-message">
          {OUTCOME_MESSAGES[plan.outcome]}
          {plan.detail === undefined
            ? null
            : <span className="mono">{` ${plan.detail}`}</span>}
        </p>
        {messageOnly
          ? null
          : plan.steps.map((step, index) => {
              const draft = drafts[index];
              if (draft === undefined) return null;
              return <StepCard key={index} index={index} step={step} draft={draft} onChange={(next) => changeDraft(index, next)} />;
            })}
        <textarea className="plan-note" placeholder="Note on the whole plan" value={planNote} onChange={(event) => setPlanNote(event.target.value)} />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={() => void dismiss()}>Dismiss</button>
          <button type="button" className="btn danger" disabled={busy} onClick={() => void reject(notes)}>Reject</button>
          {messageOnly
            ? null
            : <button type="button" className="btn primary" disabled={!canAccept} onClick={() => void approve(validCommands, notes)}>Accept</button>}
        </div>
      </div>
    </div>
  );
}
