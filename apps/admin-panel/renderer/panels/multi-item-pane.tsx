import type { Item } from "../../api/taxonomy/types.ts";
import { useDraft } from "../hooks/use-draft.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useTopCategories } from "../hooks/use-top-categories.ts";
import { useSession } from "../session-store.ts";
import { pathOf } from "../utils/path-of.ts";
import { sharedValue } from "../utils/shared-value.ts";

const MIXED = "*mixed*";

export function MultiItemPane() {
  const draft = useDraft();
  const checked = useSession((state) => state.checked);
  const editItems = useSession((state) => state.editItems);
  const categories = useTopCategories();
  const editable = useEditable();

  const items = checked.flatMap((key): Item[] => {
    const item = draft?.items[key];
    return item === undefined ? [] : [item];
  });

  const category = sharedValue(items.map((item) => item.classification.category));
  const subcategory =
    category === undefined
      ? undefined
      : sharedValue(items.map((item) => (item.classification.subcategory === null ? "" : pathOf(item.classification))));
  const top = categories.find((node) => node.path === category);

  const moveTo = (path: string) =>
    editItems(items.map((item) => ({ ...item, classification: { category: path, subcategory: null } })));

  const moveToSub = (path: string) =>
    editItems(
      items.map((item) => ({
        ...item,
        classification: {
          ...item.classification,
          subcategory: path === "" ? null : (path.split("/")[1] ?? null),
        },
      })),
    );

  return (
    <div className="pane">
      <div className="subhead">
        <div className="title">{items.length} items selected</div>
      </div>

      <div className="grp">
        <h4>Classification</h4>
        <div className="fld">
          <label htmlFor="bulk-category">Category</label>
          <select
            id="bulk-category"
            value={category ?? MIXED}
            disabled={!editable}
            onChange={(event) => moveTo(event.target.value)}
          >
            {category === undefined ? (
              <option value={MIXED} disabled>
                — mixed —
              </option>
            ) : null}
            {category !== undefined && top === undefined ? <option value={category}>{category}</option> : null}
            {categories.map((node) => (
              <option key={node.path} value={node.path}>
                {node.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="bulk-subcategory">Subcategory</label>
          <select
            id="bulk-subcategory"
            value={subcategory ?? MIXED}
            disabled={!editable || category === undefined}
            onChange={(event) => moveToSub(event.target.value)}
          >
            {subcategory === undefined ? (
              <option value={MIXED} disabled>
                — mixed —
              </option>
            ) : null}
            <option value="">— none —</option>
            {subcategory !== undefined &&
            subcategory !== "" &&
            top?.children.every((child) => child.path !== subcategory) !== false ? (
              <option value={subcategory}>{subcategory.split("/")[1]}</option>
            ) : null}
            {(top?.children ?? []).map((child) => (
              <option key={child.path} value={child.path}>
                {child.label}
              </option>
            ))}
          </select>
        </div>
        {category === undefined ? <p className="note">Pick one category before setting a subcategory.</p> : null}
      </div>
    </div>
  );
}
