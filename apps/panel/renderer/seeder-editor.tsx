import { VOCABULARY } from "@poe/agent-input/vocabulary";
import type { Seeder } from "@poe/panel-state/types";
import { useState } from "react";
import { buildSeederUpdate, toSeederDraft } from "./build-seeder-update.ts";
import { ChipList } from "./chip-list.tsx";
import { expandConditionValue } from "./expand-condition-value.ts";
import { findSeeder } from "./find-seeder.ts";
import { usePanel } from "./store.ts";

type DraftProps = { readonly category: string; readonly name: string; readonly seeder: Seeder };

function SeederDraftEditor({ category, name, seeder }: DraftProps) {
  const storedCategories = usePanel((state) => state.view?.state.categories);
  const categories = Object.keys(storedCategories ?? {}).sort();
  const busy = usePanel((state) => state.busy);
  const { dispatch, openDialog } = usePanel.getState();
  const [draft, setDraft] = useState(() => toSeederDraft(seeder));
  const [newCondition, setNewCondition] = useState("");
  const update = buildSeederUpdate(seeder, draft);
  const unused = VOCABULARY.conditions.filter((condition) => draft.conditions[condition] === undefined);

  const setCondition = (condition: string, values: readonly string[]): void =>
    setDraft({ ...draft, conditions: { ...draft.conditions, [condition]: values } });
  const dropCondition = (condition: string): void =>
    setDraft({ ...draft, conditions: Object.fromEntries(Object.entries(draft.conditions).filter(([entry]) => entry !== condition)) });

  return (
    <div className="editor">
      <div className="condition-head">
        <strong>{name}</strong>
        <select className="field" value={category} onChange={(event) => void dispatch({ type: "moveSeeders", targets: { seeders: [name] }, toCategory: event.target.value })}>
          {categories.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
        </select>
        <span className="sp" />
        <button type="button" className="btn tiny ghost" onClick={() => openDialog({ kind: "rename", target: "seeder", name })}>Rename</button>
        <button
          type="button"
          className="btn tiny ghost danger"
          onClick={() => openDialog({ kind: "confirm", message: `Delete seeder ${name}?`, command: { type: "deleteSeeders", targets: { seeders: [name] } } })}
        >
          Delete
        </button>
      </div>
      <div>
        <h3>Tags</h3>
        <ChipList values={draft.tags} placeholder="Add tag" onChange={(tags) => setDraft({ ...draft, tags })} />
      </div>
      <div>
        <h3>Known items</h3>
        <ChipList values={draft.knownItems} placeholder="Add item" onChange={(knownItems) => setDraft({ ...draft, knownItems })} />
      </div>
      <div>
        <h3>Conditions</h3>
        {Object.entries(draft.conditions).map(([condition, values]) => (
          <div key={condition} className="condition">
            <div className="condition-head">
              <span className="mono">{condition}</span>
              <span className="sp" />
              <button type="button" className="btn tiny ghost danger" onClick={() => dropCondition(condition)}>Remove</button>
            </div>
            <ChipList
              values={values}
              placeholder={`Add ${condition} value`}
              expand={(value) => expandConditionValue(condition, value)}
              suggestions={VOCABULARY.valueSets[condition]}
              onChange={(next) => setCondition(condition, next)}
            />
          </div>
        ))}
        <div className="condition-head">
          <select className="field" value={newCondition} onChange={(event) => setNewCondition(event.target.value)}>
            <option value="">Condition…</option>
            {unused.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
          </select>
          <button
            type="button"
            className="btn tiny"
            disabled={newCondition === ""}
            onClick={() => {
              setCondition(newCondition, []);
              setNewCondition("");
            }}
          >
            Add condition
          </button>
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn ghost" disabled={!update.changed} onClick={() => setDraft(toSeederDraft(seeder))}>Reset</button>
        <button
          type="button"
          className="btn primary"
          disabled={busy || !update.changed}
          onClick={() => void dispatch({ type: "updateSeeders", targets: { seeders: [name] }, add: update.add, remove: update.remove })}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export function SeederEditor() {
  const state = usePanel((store) => store.view?.state);
  const selected = usePanel((store) => store.selectedSeeder);
  const found = state === undefined || selected === undefined
    ? undefined
    : findSeeder(state, selected);

  return (
    <section className="col">
      <div className="head"><span>Seeder</span></div>
      <div className="body">
        {found === undefined
          ? <p className="empty">Select a seeder.</p>
          : <SeederDraftEditor key={`${found.name}:${JSON.stringify(found.seeder)}`} category={found.category} name={found.name} seeder={found.seeder} />}
      </div>
    </section>
  );
}
