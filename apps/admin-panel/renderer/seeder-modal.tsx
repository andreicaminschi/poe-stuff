import { CONDITIONS } from "@poe/filter-eval/filter-ast";
import { useEffect, useState } from "react";
import type { ConditionValue, Seeder } from "../types.ts";
import { ChipList } from "./chip-list.tsx";
import { findFreeName } from "./find-free-name.ts";
import { generateItems } from "./generate-items.ts";
import { readSeederCategory, readSeederName } from "./seeder-key.ts";
import { usePanel } from "./store.ts";
import { readKind, ValueEditor } from "./value-editor.tsx";

type Row = { readonly key: string; readonly values: readonly ConditionValue[] };

const CONDITION_NAMES = Object.keys(CONDITIONS).sort();

/** Turns a seeder's conditions into editable rows. Low, Sonar 0. */
const toRows = (seeder: Seeder): readonly Row[] =>
  Object.entries(seeder.conditions).map(([key, values]) => ({ key, values }));

/** Lists what stops a seeder from being applied, or nothing when it can be. Medium, Sonar 3. */
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

export function SeederModal() {
  const editing = usePanel((state) => state.editing);
  const loaded = usePanel((state) => state.loaded);
  const { closeEditor, applySeeder, deleteSeeder } = usePanel.getState();

  const categoryName = editing === undefined
    ? ""
    : readSeederCategory(editing);
  const category = loaded?.categories.find((at) => at.name === categoryName);
  const original = category?.seeders.find((seeder) => seeder.name === readSeederName(editing ?? ""));

  const [name, setName] = useState("");
  const [rows, setRows] = useState<readonly Row[]>([]);
  const [tags, setTags] = useState<readonly string[]>([]);
  const [knownItems, setKnownItems] = useState<readonly string[]>([]);
  const [targetName, setTargetName] = useState(categoryName);

  useEffect(() => {
    if (original === undefined) return;
    setTargetName(categoryName);
    setName(original.name);
    setRows(toRows(original));
    setTags(original.tags);
    setKnownItems(original.knownItems ?? []);
  }, [original, categoryName]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEditor();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeEditor]);

  if (editing === undefined || category === undefined || original === undefined) return null;

  const target = loaded?.categories.find((at) => at.name === targetName) ?? category;
  const takenNames = target.seeders
    .map((seeder) => seeder.name)
    .filter((at) => target.name !== category.name || at !== original.name);
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
  const count = generateItems({ name: target.name, seeders: [draft] }).length;
  const problems = listProblems(name, rows);
  const setRow = (at: number, next: Row) => setRows(rows.map((row, index) => (index === at
    ? next
    : row)));

  return (
    <div className="scrim" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <input className="sname" value={name} aria-label="Seeder name" onChange={(event) => setName(event.target.value)} />
          <span className="faint">in</span>
          <select className="target" value={target.name} aria-label="Category" onChange={(event) => setTargetName(event.target.value)}>
            {(loaded?.categories ?? []).map((at) => <option key={at.name} value={at.name}>{at.name}</option>)}
          </select>
          {name.trim() !== "" && savedName !== name.trim()
            ? <span className="faint">{`saved as ${savedName}`}</span>
            : null}
          <span className="pill mono">{`generates ${count} items`}</span>
          <span className="sp" />
          <button type="button" className="btn x" aria-label="Close" onClick={closeEditor}>×</button>
        </div>
        <div className="modal-body">
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
        <div className="modal-foot">
          <button type="button" className="btn danger" onClick={() => deleteSeeder(editing)}>Delete seeder</button>
          <span className="sp" />
          <button type="button" className="btn" onClick={closeEditor}>Cancel</button>
          <button type="button" className="btn primary" disabled={problems.length > 0} onClick={() => applySeeder(editing, draft, target.name)}>Apply</button>
        </div>
      </div>
    </div>
  );
}
