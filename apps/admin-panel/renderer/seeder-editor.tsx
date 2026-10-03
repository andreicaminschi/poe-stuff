import { CONDITIONS } from "@poe/filter-eval/filter-ast";
import { useEffect, useState } from "react";
import type { Category, ConditionValue, Seeder } from "../types.ts";
import { ChipList } from "./chip-list.tsx";
import { findFreeName } from "../find-free-name.ts";
import { listSeederNames } from "../panel-state.ts";
import { generateItems } from "./generate-items.ts";
import { usePanel } from "./store.ts";
import { readKind, ValueEditor } from "./value-editor.tsx";

type Row = { readonly key: string; readonly values: readonly ConditionValue[] };

const CONDITION_NAMES = Object.keys(CONDITIONS).sort();

/** Turns a seeder's conditions into editable rows. */
const toRows = (seeder: Seeder): readonly Row[] =>
  Object.entries(seeder.conditions).map(([key, values]) => ({ key, values }));

/** Lists what stops a seeder from being applied, or nothing when it can be. */
function listProblems(name: string, rows: readonly Row[]): readonly string[] {
  const keys = rows.map((row) => row.key);

  return [
    ...(name.trim() === ""
      ? ["The seeder needs a name."]
      : []),
    ...keys.filter((key) => readKind(key) === undefined).map((key) => `"${key}" is not an in-game condition.`),
    ...keys.filter((key, at) => keys.indexOf(key) !== at).map((key) => `"${key}" appears twice.`),
  ];
}

/** Edits one seeder. Mounted with a key per seeder, so its state starts from the seeder. */
export function SeederEditor({
  seederKey,
  category,
  original,
  categories,
}: {
  readonly seederKey: string;
  readonly category: Category;
  readonly original: Seeder;
  readonly categories: readonly Category[];
}) {
  const { applySeeder, deleteSeeder, setDirty } = usePanel.getState();

  const [name, setName] = useState(original.name);
  const [rows, setRows] = useState<readonly Row[]>(toRows(original));
  const [tags, setTags] = useState<readonly string[]>(original.tags);
  const [knownItems, setKnownItems] = useState<readonly string[]>(original.knownItems ?? []);
  const [targetName, setTargetName] = useState(category.name);

  const revert = () => {
    setName(original.name);
    setRows(toRows(original));
    setTags(original.tags);
    setKnownItems(original.knownItems ?? []);
    setTargetName(category.name);
  };

  const target = categories.find((at) => at.name === targetName) ?? category;
  const takenNames = listSeederNames(categories).filter((at) => at !== original.name);
  const savedName = findFreeName(name.trim(), takenNames);

  const { knownItems: _dropped, ...rest } = original;
  const draft: Seeder = {
    ...rest,
    name: savedName,
    conditions: Object.fromEntries(rows.map((row) => [row.key, row.values])),
    ...(knownItems.length === 0
      ? {}
      : { knownItems }),
    tags,
  };
  const dirty = target.name !== category.name || JSON.stringify(draft) !== JSON.stringify(original);
  const count = generateItems({ name: target.name, seeders: [draft] }).length;
  const problems = listProblems(name, rows);
  const setRow = (at: number, next: Row) => setRows(rows.map((row, index) => (index === at
    ? next
    : row)));

  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);

  return (
    <section className="col editor">
      <div className="head">
        <input className="sname" value={name} aria-label="Seeder name" onChange={(event) => setName(event.target.value)} />
        <span className="faint">in</span>
        <select value={target.name} aria-label="Category" onChange={(event) => setTargetName(event.target.value)}>
          {categories.map((at) => <option key={at.name} value={at.name}>{at.name}</option>)}
        </select>
        {name.trim() !== "" && savedName !== name.trim()
          ? <span className="faint">{`saved as ${savedName}`}</span>
          : null}
        <span className="sp" />
        <span className="pill mono">{`generates ${count} items`}</span>
      </div>
      <div className="body editor-body">
        <datalist id="condition-names">
          {CONDITION_NAMES.map((conditionName) => <option key={conditionName} value={conditionName} />)}
        </datalist>
        {rows.map((row, at) => (
          <div
            className={readKind(row.key) === undefined
              ? "crow bad"
              : "crow"}
            key={at}
          >
            <input
              className="name"
              list="condition-names"
              value={row.key}
              aria-label="Condition"
              onChange={(event) => {
                const key = event.target.value;
                setRow(at, { key, values: readKind(key) === readKind(row.key)
                  ? row.values
                  : [] });
              }}
            />
            <span className="kind">{readKind(row.key) ?? "?"}</span>
            <ValueEditor conditionKey={row.key} values={row.values} onChange={(values) => setRow(at, { key: row.key, values })} />
            <button type="button" className="btn x" aria-label="Remove condition" onClick={() => setRows(rows.filter((_, index) => index !== at))}>×</button>
          </div>
        ))}
        <div className="seeder-foot">
          <button type="button" className="btn tiny ghost" onClick={() => setRows([...rows, { key: "", values: [] }])}>+ Condition</button>
        </div>
        <div className="fld">
          <span className="dim">Known items</span>
          <ChipList values={knownItems} placeholder="Add item" onChange={setKnownItems} />
        </div>
        <div className="fld">
          <span className="dim">Seeder tags</span>
          <ChipList values={tags} placeholder="Add tag" onChange={setTags} />
        </div>
        {problems.map((problem) => <p className="err" key={problem}>{problem}</p>)}
      </div>
      <div className="foot">
        <button type="button" className="btn danger" onClick={() => deleteSeeder(seederKey)}>Delete seeder</button>
        <span className="sp" />
        <button type="button" className="btn" disabled={!dirty} onClick={revert}>Revert</button>
        <button
          type="button"
          className="btn primary"
          disabled={!dirty || problems.length > 0}
          onClick={() => void applySeeder(seederKey, draft, target.name)}
        >
          Apply
        </button>
      </div>
    </section>
  );
}
