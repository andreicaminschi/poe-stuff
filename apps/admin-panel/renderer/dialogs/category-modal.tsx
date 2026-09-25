import { useMemo, useState } from "react";
import { resolvePath } from "@poe/filter-compile/resolve-row";
import type { Category, Condition, Hint, Tiering } from "../../api/taxonomy/types.ts";
import { ConditionsEditor } from "../components/conditions-editor.tsx";
import { Modal } from "../components/modal.tsx";
import { Segmented } from "../components/segmented.tsx";
import { useConditionNames } from "../hooks/use-condition-names.ts";
import { useValueOptions } from "../hooks/use-value-options.ts";
import { useDraft } from "../hooks/use-draft.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useTopCategories } from "../hooks/use-top-categories.ts";
import { useSession } from "../session-store.ts";
import type { CategoryTarget } from "../types.ts";
import { categoryDeleteProblem } from "../utils/category-delete-problem.ts";
import { conditionOrigins } from "../utils/condition-origins.ts";
import { categoryDialogTitle } from "../utils/category-dialog-title.ts";
import { categoryPath } from "../utils/category-path.ts";
import { categorySaveNote } from "../utils/category-save-note.ts";
import { initialParent } from "../utils/initial-parent.ts";
import { newCategoryProblem } from "../utils/new-category-problem.ts";
import { parseSamples } from "../utils/parse-samples.ts";

const TIERING: readonly (readonly [Tiering, string])[] = [
  ["chaos", "By price"],
  ["stack-size", "By stack size"],
];

const HINTS: readonly (readonly [Hint, string])[] = [
  ["check", "Check"],
  ["gamble", "Gamble"],
];

export function CategoryModal({ target }: { readonly target: CategoryTarget }) {
  const draft = useDraft();
  const tops = useTopCategories();
  const names = useConditionNames();
  const valueOptions = useValueOptions();
  const editable = useEditable();
  const saveCategory = useSession((state) => state.saveCategory);
  const deleteCategory = useSession((state) => state.deleteCategory);
  const busy = useSession((state) => state.busy);
  const closeDialog = useSession((state) => state.closeDialog);
  const confirm = useSession((state) => state.confirm);
  const moveTo = useSession((state) => state.moveSubcategory);
  const renameTo = useSession((state) => state.renameCategory);

  const existing = target.kind === "edit" ? draft?.categories[target.path] : undefined;
  const selection = useSession((state) => state.selection);
  const [parent, setParent] = useState(() => initialParent(target, selection, tops));
  const [slug, setSlug] = useState(target.kind === "edit" ? (target.path.split("/").at(-1) ?? "") : "");
  const [name, setName] = useState(existing?.name ?? "");
  const [tiering, setTiering] = useState<Tiering>(existing?.tiering ?? "chaos");
  const [hints, setHints] = useState<readonly Hint[]>(existing?.hints ?? []);
  const [conditions, setConditions] = useState<readonly Condition[]>(existing?.conditions ?? []);
  const [samplesText, setSamplesText] = useState(() =>
    existing?.samples === undefined ? "" : JSON.stringify(existing.samples, null, 2),
  );
  const parsedSamples = parseSamples(samplesText);
  const samplesProblem = "problem" in parsedSamples ? parsedSamples.problem : undefined;

  const isSub = target.kind === "new-subcategory" || (target.kind === "edit" && target.path.includes("/"));
  const path = categoryPath(target, parent, slug);

  const composed = useMemo(
    () => (draft === undefined || path === "" ? undefined : resolvePath({ ...draft.categories, [path]: { conditions } }, path)),
    [draft, path, conditions],
  );

  const oldSlug = target.kind === "edit" ? (target.path.split("/").at(-1) ?? "") : "";
  const moving = target.kind === "edit" && isSub && parent !== (target.path.split("/")[0] ?? "");
  const renaming = target.kind === "edit" && slug !== oldSlug;
  const movedPath = `${parent}/${oldSlug}`;
  const renamedPath = isSub ? `${parent}/${slug}` : slug;

  const problem =
    target.kind === "edit" ? undefined : newCategoryProblem(slug, path, draft?.categories[path] !== undefined);
  const moveProblem = moving && draft?.categories[movedPath] !== undefined ? `${movedPath} already exists.` : undefined;
  const renameProblem = renaming
    ? newCategoryProblem(slug, renamedPath, draft?.categories[renamedPath] !== undefined)
    : undefined;
  const note =
    moveProblem === undefined && renameProblem === undefined
      ? categorySaveNote(path, moving ? movedPath : undefined, renaming ? renamedPath : undefined)
      : undefined;

  const title = categoryDialogTitle(target, existing !== undefined);
  const deletable = target.kind === "edit" && existing !== undefined && editable;
  const deleteProblem = deletable && draft !== undefined ? categoryDeleteProblem(draft, path) : undefined;

  const record = (at: string): Category => ({
    path: at,
    ...(name.trim() === "" ? {} : { name: name.trim() }),
    tiering,
    ...(isSub || hints.length === 0 ? {} : { hints }),
    ...("samples" in parsedSamples && parsedSamples.samples.length > 0 ? { samples: parsedSamples.samples } : {}),
    conditions,
  });

  const submit = async () => {
    if (moving) {
      await moveTo(path, record(movedPath));
      if (useSession.getState().error !== undefined) return;
    }
    if (renaming) await renameTo(moving ? movedPath : path, record(renamedPath));
    if (!moving && !renaming) await saveCategory(record(path));
    if (useSession.getState().error === undefined) closeDialog();
  };

  const remove = async () => {
    if (!(await confirm(`Delete ${path}? Undo brings it back.`))) return;
    void deleteCategory(path).then(() => {
      if (useSession.getState().error === undefined) closeDialog();
    });
  };

  return (
    <Modal
      title={title}
      onClose={closeDialog}
      footer={
        <>
          {deletable ? (
            <button
              type="button"
              className="btn"
              disabled={busy || deleteProblem !== undefined}
              title={deleteProblem ?? "Delete this category"}
              onClick={() => void remove()}
            >
              Delete
            </button>
          ) : null}
          <button type="button" className="btn" onClick={closeDialog}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={
              !editable ||
              busy ||
              problem !== undefined ||
              moveProblem !== undefined ||
              renameProblem !== undefined ||
              samplesProblem !== undefined
            }
            onClick={() => void submit()}
          >
            Save
          </button>
        </>
      }
    >
      <div className="grp">
        {target.kind === "new-subcategory" || (target.kind === "edit" && isSub) ? (
          <div className="fld">
            <label htmlFor="cat-parent">Category</label>
            <select
              id="cat-parent"
              value={parent}
              disabled={!editable}
              onChange={(event) => setParent(event.target.value)}
            >
              {tops.map((node) => (
                <option key={node.path} value={node.path}>
                  {node.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="fld">
          <label htmlFor="cat-slug">{isSub ? "Subcategory" : "Category"}</label>
          <input
            id="cat-slug"
            type="text"
            className="mono"
            value={slug}
            disabled={!editable}
            placeholder="lowercase-with-hyphens"
            onChange={(event) => setSlug(event.target.value)}
          />
        </div>
        {problem === undefined ? null : <p className="err">{problem}</p>}
        {moveProblem === undefined ? null : <p className="err">{moveProblem}</p>}
        {renameProblem === undefined ? null : <p className="err">{renameProblem}</p>}
        {note === undefined ? null : <p className="note">{note}</p>}
        {deleteProblem === undefined ? null : <p className="note">Cannot delete: {deleteProblem}</p>}
        {target.kind === "edit" && existing === undefined ? (
          <p className="note">Rows are filed here but it has no record. Saving writes one.</p>
        ) : null}
        <div className="fld">
          <label htmlFor="cat-name">Friendly name</label>
          <input
            id="cat-name"
            type="text"
            value={name}
            placeholder="how it reads in a picker"
            disabled={!editable}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="fld">
          <label>Tiering</label>
          <Segmented value={tiering} options={TIERING} disabled={!editable} onChange={setTiering} />
        </div>
        {isSub ? null : (
          <div className="fld">
            <label>Hints</label>
            <div className="rarities">
              {HINTS.map(([hint, label]) => (
                <label key={hint} className="check">
                  <input
                    type="checkbox"
                    checked={hints.includes(hint)}
                    disabled={!editable}
                    onChange={(event) =>
                      setHints(
                        HINTS.map(([one]) => one).filter((one) =>
                          one === hint ? event.target.checked : hints.includes(one),
                        ),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="grp">
        <h4>Conditions</h4>
        <ConditionsEditor
          own={conditions}
          {...(editable ? { onChange: setConditions } : {})}
          {...(composed === undefined
            ? {}
            : {
                resolved: {
                  label: "Conditions applied to items here",
                  conditions: composed.applied,
                  removed: composed.removed,
                  problems: [],
                  origins: conditionOrigins({
                    category: path.split("/")[0] ?? path,
                    subcategory: path.split("/")[1] ?? null,
                  }),
                },
              })}
          level={isSub ? "subcategory" : "category"}
          names={names}
          valueOptions={valueOptions}
        />
      </div>
      <div className="grp">
        <h4>Samples</h4>
        <p className="note">Sample items the filter validator builds for rows here. A subcategory's list replaces its category's.</p>
        <textarea
          id="cat-samples"
          className="mono"
          rows={8}
          value={samplesText}
          disabled={!editable}
          placeholder='[{ "BaseType": { "from": "baseTypes" }, "Rarity": { "values": ["Normal", "Magic"] } }]'
          onChange={(event) => setSamplesText(event.target.value)}
        />
        {samplesProblem === undefined ? null : <p className="err">{samplesProblem}</p>}
      </div>
    </Modal>
  );
}
