import { VOCABULARY } from "@poe/agent-input/vocabulary";
import type { Bag, Seeder } from "@poe/panel-state/types";
import { useState } from "react";
import { buildSeederUpdate, splitsByDefault, toSeederDraft, type SeederDraft } from "./build-seeder-update.ts";
import { ChipList } from "./chip-list.tsx";
import { ConditionRow } from "./condition-row.tsx";
import { findSeeder } from "./find-seeder.ts";
import { usePanel } from "./store.ts";

type DraftProps = { readonly category: string; readonly name: string; readonly seeder: Seeder; readonly tags: Bag | undefined };

/** Runs the draft's commands in order, stopping at the first refused one. */
async function applyDraft(name: string, category: string, seeder: Seeder, tags: Bag | undefined, draft: SeederDraft): Promise<void> {
  const { dispatch, selectSeeder } = usePanel.getState();
  const update = buildSeederUpdate(seeder, tags, draft);
  const tagsChanged = update.tags.add.length + update.tags.remove.length > 0;
  const to = draft.name.trim();

  if (update.changed && !await dispatch({ type: "updateSeeders", targets: { seeders: [name] }, add: update.add, remove: update.remove })) return;
  if (tagsChanged && !await dispatch({ type: "updateSeederTags", targets: { seeders: [name] }, add: update.tags.add, remove: update.tags.remove })) return;
  if (draft.category !== category && !await dispatch({ type: "moveSeeders", targets: { seeders: [name] }, toCategory: draft.category })) return;
  if (to !== name && await dispatch({ type: "rename", target: "seeder", name, to })) selectSeeder(to);
}

function SeederDraftEditor({ category, name, seeder, tags }: DraftProps) {
  const storedCategories = usePanel((state) => state.view?.state.categories);
  const categories = Object.keys(storedCategories ?? {}).sort();
  const busy = usePanel((state) => state.busy);
  const [draft, setDraft] = useState(() => toSeederDraft(name, category, seeder, tags));
  const [newCondition, setNewCondition] = useState("");
  const update = buildSeederUpdate(seeder, tags, draft);
  const knownCategory = categories.includes(draft.category);
  const changed = update.changed || update.tags.add.length + update.tags.remove.length > 0 || draft.category !== category || draft.name.trim() !== name;
  const unused = [...VOCABULARY.conditions, "UnidentifiedItemTier"].filter((condition) => draft.conditions[condition] === undefined);

  const addCondition = (condition: string): void => {
    if (!unused.includes(condition)) return;
    setDraft({ ...draft, conditions: { ...draft.conditions, [condition]: {} }, split: { ...draft.split, [condition]: splitsByDefault(condition) } });
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
      <label className="field-row">
        Category
        <input className="field" list="seeder-categories" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
        <datalist id="seeder-categories">{categories.map((entry) => <option key={entry} value={entry} />)}</datalist>
      </label>
      <div>
        <h3>Tags</h3>
        <ChipList values={draft.tags} placeholder="Add tag" onChange={(tags) => setDraft({ ...draft, tags })} />
      </div>
      <div>
        <h3>Names</h3>
        <ChipList values={draft.names} placeholder="Add name" onChange={(names) => setDraft({ ...draft, names })} />
      </div>
      <div>
        <h3>Conditions</h3>
        <div className="condition-grid">
          <span className="grid-head">Condition</span>
          <span className="grid-head">Operator</span>
          <span className="grid-head">Values</span>
          <span className="grid-head">Actions</span>
          {Object.entries(draft.conditions).map(([condition, values]) => (
            <ConditionRow
              key={condition}
              condition={condition}
              values={values}
              split={draft.split[condition] ?? splitsByDefault(condition)}
              onValues={(next) => setDraft({ ...draft, conditions: { ...draft.conditions, [condition]: next } })}
              onSplit={(split) => setDraft({ ...draft, split: { ...draft.split, [condition]: split } })}
              onRemove={() => dropCondition(condition)}
            />
          ))}
        </div>
        <input
          className="field"
          list="seeder-conditions"
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
        <datalist id="seeder-conditions">{unused.map((condition) => <option key={condition} value={condition} />)}</datalist>
      </div>
      <div className="actions">
        <button type="button" className="btn ghost" disabled={!changed} onClick={() => setDraft(toSeederDraft(name, category, seeder, tags))}>Reset</button>
        <button
          type="button"
          className="btn primary"
          disabled={busy || !changed || !knownCategory || draft.name.trim() === ""}
          onClick={() => void applyDraft(name, category, seeder, tags, draft)}
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
  const openDialog = usePanel((store) => store.openDialog);
  const found = state === undefined || selected === undefined
    ? undefined
    : findSeeder(state, selected);

  return (
    <section className="col">
      <div className="head">
        <span>Seeder</span>
        <span className="sp" />
        {found === undefined
          ? null
          : (
              <button
                type="button"
                className="btn tiny ghost danger"
                onClick={() => openDialog({ kind: "confirm", message: `Delete seeder ${found.name}?`, command: { type: "deleteSeeders", targets: { seeders: [found.name] } } })}
              >
                Delete
              </button>
            )}
      </div>
      <div className="body">
        {found === undefined
          ? <p className="empty">Select a seeder.</p>
          : (
              <SeederDraftEditor
                key={`${found.name}:${found.category}:${JSON.stringify(found.seeder)}:${JSON.stringify(state?.seederTags[found.name])}`}
                category={found.category}
                name={found.name}
                seeder={found.seeder}
                tags={state?.seederTags[found.name]?.tags}
              />
            )}
      </div>
    </section>
  );
}
