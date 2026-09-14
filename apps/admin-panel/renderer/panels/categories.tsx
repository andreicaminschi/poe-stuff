import { useMemo } from "react";
import { CategoryBranch } from "../components/category-branch.tsx";
import { useCategoryTree } from "../hooks/use-category-tree.ts";
import { useDraft } from "../hooks/use-draft.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useSession } from "../session-store.ts";
import type { View } from "../types.ts";
import { rowInView } from "../utils/row-in-view.ts";

const VIEWS: readonly (readonly [View, string])[] = [
  ["included", "Included"],
  ["excluded", "Excluded"],
  ["untouched", "Untouched"],
];

export function Categories() {
  const tree = useCategoryTree();
  const draft = useDraft();
  const editable = useEditable();
  const view = useSession((state) => state.view);
  const setView = useSession((state) => state.setView);
  const selection = useSession((state) => state.selection);
  const select = useSession((state) => state.toggleCategory);
  const openDialog = useSession((state) => state.openDialog);

  const counts = useMemo(() => {
    const rows = Object.values(draft?.items ?? {});
    const count = (view: View) => rows.filter((row) => rowInView(row, view)).length;
    return { included: count("included"), excluded: count("excluded"), untouched: count("untouched") };
  }, [draft]);

  if (tree === undefined) return null;

  const edit = (path: string) => openDialog({ kind: "category", target: { kind: "edit", path } });

  return (
    <div className="col cats">
      <div className="head">
        <p className="label">Categories</p>
      </div>
      <div className="tabs" role="tablist">
        {VIEWS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            className={view === value ? "on" : ""}
            onClick={() => setView(value)}
          >
            {label} <span className="mono faint">{counts[value]}</span>
          </button>
        ))}
      </div>
      <div className="body">
        {tree.nodes.map((node) => (
          <CategoryBranch
            key={node.path}
            node={node}
            {...(selection === undefined ? {} : { selection })}
            onSelect={select}
            onEdit={edit}
          />
        ))}
      </div>
      <div className="foot">
        <button
          type="button"
          className="btn tiny ghost grow"
          disabled={!editable}
          onClick={() => openDialog({ kind: "category", target: { kind: "new-category" } })}
        >
          + Category
        </button>
        <button
          type="button"
          className="btn tiny ghost grow"
          disabled={!editable}
          onClick={() => openDialog({ kind: "category", target: { kind: "new-subcategory" } })}
        >
          + Subcategory
        </button>
      </div>
    </div>
  );
}
