import { CategoryBranch } from "../components/category-branch.tsx";
import { useCategoryTree } from "../hooks/use-category-tree.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useSession } from "../session-store.ts";

export function Categories() {
  const tree = useCategoryTree();
  const editable = useEditable();
  const selection = useSession((state) => state.selection);
  const select = useSession((state) => state.select);
  const openDialog = useSession((state) => state.openDialog);

  if (tree === undefined) return null;

  const edit = (path: string) => openDialog({ kind: "category", target: { kind: "edit", path } });

  return (
    <div className="col cats">
      <div className="head">
        <p className="label">Categories</p>
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
        {tree.excluded === undefined ? null : (
          <>
            <div className="catsplit" />
            <CategoryBranch
              node={tree.excluded}
              {...(selection === undefined ? {} : { selection })}
              onSelect={select}
              onEdit={edit}
            />
          </>
        )}
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
