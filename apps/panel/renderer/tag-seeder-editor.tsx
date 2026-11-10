import { VOCABULARY } from "@poe/agent-input/vocabulary";
import type { PanelState, TagSeeder } from "@poe/panel-state/types";
import { Fragment, useState } from "react";
import {
  buildTagSeederUpdate,
  EMPTY_TAG_SEEDER_DRAFT,
  isCompleteDraft,
  toTagSeederDraft,
  type TagSeederDraft,
} from "./build-tag-seeder-update.ts";
import { ChipList } from "./chip-list.tsx";
import { listConditionValues } from "./list-condition-values.ts";
import { listFilterOptions } from "./list-filter-options.ts";
import { usePanel } from "./store.ts";

type DraftProps = { readonly state: PanelState; readonly name: string | undefined; readonly tagSeeder: TagSeeder | undefined };

/** Creates the drafted tag seeder, or updates and renames the stored one, stopping at the first refused command. */
async function applyDraft(name: string | undefined, tagSeeder: TagSeeder | undefined, draft: TagSeederDraft): Promise<void> {
  const { dispatch, pickTagSeeder } = usePanel.getState();
  const to = draft.name.trim();

  if (name === undefined || tagSeeder === undefined) {
    if (await dispatch({ type: "createTagSeeder", name: to, conditions: draft.conditions, tags: draft.tags })) pickTagSeeder({ kind: "stored", name: to });
    return;
  }
  const update = buildTagSeederUpdate(tagSeeder, draft);
  if (update.changed && !await dispatch({ type: "updateTagSeeder", name, add: update.add, remove: update.remove })) return;
  if (to !== name && await dispatch({ type: "rename", target: "tagSeeder", name, to })) pickTagSeeder({ kind: "stored", name: to });
}

function TagSeederDraftEditor({ state, name, tagSeeder }: DraftProps) {
  const busy = usePanel((store) => store.busy);
  const initial = name === undefined || tagSeeder === undefined
    ? EMPTY_TAG_SEEDER_DRAFT
    : toTagSeederDraft(name, tagSeeder);
  const [draft, setDraft] = useState(initial);
  const [newCondition, setNewCondition] = useState("");
  const changed = tagSeeder === undefined || buildTagSeederUpdate(tagSeeder, draft).changed || draft.name.trim() !== name;
  const unused = [...VOCABULARY.conditions, "UnidentifiedItemTier"].filter((condition) => draft.conditions[condition] === undefined);

  const addCondition = (condition: string): void => {
    if (!unused.includes(condition)) return;
    setDraft({ ...draft, conditions: { ...draft.conditions, [condition]: [] } });
    setNewCondition("");
  };
  const dropCondition = (condition: string): void =>
    setDraft({ ...draft, conditions: Object.fromEntries(Object.entries(draft.conditions).filter(([entry]) => entry !== condition)) });

  return (
    <div className="editor">
      <label className="field-row">
        Name
        <input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </label>
      <div>
        <h3>Tags</h3>
        <ChipList values={draft.tags} placeholder="Add tag" suggestions={listFilterOptions(state, "tag")} onChange={(tags) => setDraft({ ...draft, tags })} />
      </div>
      <div>
        <h3>Conditions</h3>
        <p className="empty">An item matches when it holds one listed value of every condition.</p>
        <div className="tag-condition-grid">
          <span className="grid-head">Condition</span>
          <span className="grid-head">Values</span>
          <span className="grid-head" />
          {Object.entries(draft.conditions).map(([condition, values]) => (
            <Fragment key={condition}>
              <span className="mono condition-name">{condition}</span>
              <ChipList
                values={values}
                placeholder={`Add ${condition} value`}
                suggestions={listConditionValues(state, condition)}
                onChange={(next) => setDraft({ ...draft, conditions: { ...draft.conditions, [condition]: next } })}
              />
              <button type="button" className="btn tiny ghost danger" aria-label={`Remove ${condition}`} onClick={() => dropCondition(condition)}>×</button>
            </Fragment>
          ))}
        </div>
        <input
          className="field"
          list="tag-seeder-conditions"
          placeholder="Add condition…"
          value={newCondition}
          onChange={(event) => {
            setNewCondition(event.target.value);
            if (unused.includes(event.target.value)) addCondition(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addCondition(newCondition.trim());
          }}
        />
        <datalist id="tag-seeder-conditions">{unused.map((condition) => <option key={condition} value={condition} />)}</datalist>
      </div>
      <div className="actions">
        <button type="button" className="btn ghost" disabled={!changed} onClick={() => setDraft(initial)}>Reset</button>
        <button
          type="button"
          className="btn primary"
          disabled={busy || !changed || !isCompleteDraft(draft)}
          onClick={() => void applyDraft(name, tagSeeder, draft)}
        >
          {tagSeeder === undefined
            ? "Create"
            : "Apply"}
        </button>
      </div>
    </div>
  );
}

export function TagSeederEditor() {
  const state = usePanel((store) => store.view?.state);
  const pick = usePanel((store) => store.tagSeederPick);
  const openDialog = usePanel((store) => store.openDialog);
  const name = pick?.kind === "stored"
    ? pick.name
    : undefined;
  const tagSeeder = name === undefined
    ? undefined
    : state?.tagSeeders[name];
  const shown = pick?.kind === "new" || tagSeeder !== undefined;

  return (
    <section className="col">
      <div className="head">
        <span>Tag seeder</span>
        <span className="sp" />
        {name === undefined || tagSeeder === undefined
          ? null
          : (
              <button
                type="button"
                className="btn tiny ghost danger"
                onClick={() => openDialog({ kind: "confirm", message: `Delete tag seeder ${name}?`, command: { type: "deleteTagSeeder", name } })}
              >
                Delete
              </button>
            )}
      </div>
      <div className="body">
        {state !== undefined && shown
          ? <TagSeederDraftEditor key={`${name ?? "new"}:${JSON.stringify(tagSeeder)}`} state={state} name={name} tagSeeder={tagSeeder} />
          : <p className="empty">Select a tag seeder.</p>}
      </div>
    </section>
  );
}
