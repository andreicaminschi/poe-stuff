import { useEffect, useState } from "react";
import type { Condition, Tiering } from "../../api/taxonomy.types.ts";
import type { Resolution } from "../../api/taxonomy.resolve.api.ts";
import { ConditionsEditor } from "../components/conditions-editor.tsx";
import { Modal } from "../components/modal.tsx";
import { Segmented } from "../components/segmented.tsx";
import { useConditionNames } from "../hooks/use-condition-names.ts";
import { useDraft } from "../hooks/use-draft.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useTopCategories } from "../hooks/use-top-categories.ts";
import { useSession } from "../session-store.ts";
import type { CategoryTarget } from "../types.ts";
import { categoryDialogTitle } from "../utils/category-dialog-title.ts";
import { categoryPath } from "../utils/category-path.ts";
import { newCategoryProblem } from "../utils/new-category-problem.ts";

const TIERING: readonly (readonly [Tiering, string])[] = [
  ["chaos", "By price"],
  ["stack-size", "By stack size"],
];

export function CategoryModal({ target }: { readonly target: CategoryTarget }) {
  const draft = useDraft();
  const tops = useTopCategories();
  const names = useConditionNames();
  const editable = useEditable();
  const versionId = useSession((state) => state.versionId);
  const saved = useSession((state) => state.saved);
  const editCategory = useSession((state) => state.editCategory);
  const closeDialog = useSession((state) => state.closeDialog);

  const existing = target.kind === "edit" ? draft?.categories[target.path] : undefined;
  const [parent, setParent] = useState(target.kind === "edit" ? (target.path.split("/")[0] ?? "") : (tops[0]?.path ?? ""));
  const [slug, setSlug] = useState(target.kind === "edit" ? (target.path.split("/").at(-1) ?? "") : "");
  const [name, setName] = useState(existing?.name ?? "");
  const [tiering, setTiering] = useState<Tiering>(existing?.tiering ?? "chaos");
  const [conditions, setConditions] = useState<readonly Condition[]>(existing?.conditions ?? []);
  const [resolution, setResolution] = useState<Resolution | undefined>();

  const isSub = target.kind === "new-subcategory" || (target.kind === "edit" && target.path.includes("/"));
  const path = categoryPath(target, parent, slug);

  useEffect(() => {
    if (target.kind !== "edit" || versionId === undefined) return;
    let live = true;
    window.panel.resolveCategory(versionId, target.path).then(
      (answer) => {
        if (live) setResolution(answer);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [target, versionId, saved]);

  const problem =
    target.kind === "edit" ? undefined : newCategoryProblem(slug, path, draft?.categories[path] !== undefined);

  const title = categoryDialogTitle(target, existing !== undefined);

  return (
    <Modal
      title={title}
      onClose={closeDialog}
      footer={
        <>
          <button type="button" className="btn" onClick={closeDialog}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!editable || problem !== undefined}
            onClick={() => {
              editCategory({ path, ...(name.trim() === "" ? {} : { name: name.trim() }), tiering, conditions });
              closeDialog();
            }}
          >
            Save
          </button>
        </>
      }
    >
      <div className="grp">
        {target.kind === "new-subcategory" ? (
          <div className="fld">
            <label htmlFor="cat-parent">Category</label>
            <select id="cat-parent" value={parent} onChange={(event) => setParent(event.target.value)}>
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
            disabled={target.kind === "edit"}
            placeholder="lowercase-with-hyphens"
            onChange={(event) => setSlug(event.target.value)}
          />
        </div>
        {problem === undefined ? null : <p className="err">{problem}</p>}
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
      </div>
      <div className="grp">
        <h4>Conditions</h4>
        <ConditionsEditor
          own={conditions}
          {...(editable ? { onChange: setConditions } : {})}
          {...(resolution === undefined
            ? {}
            : {
                inherited: resolution.conditions.filter((condition) => isSub && condition.level === "category"),
                resolved: { label: "An item here matches", conditions: resolution.conditions, problems: resolution.problems },
              })}
          note={target.kind === "edit" ? "Resolved against the saved draft. ‹name› is each row's own." : "Save the draft to resolve it."}
          names={names}
        />
      </div>
    </Modal>
  );
}
