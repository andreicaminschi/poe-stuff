import type { Condition, Item } from "../../api/taxonomy/types.ts";
import { ConditionsEditor } from "../components/conditions-editor.tsx";
import { useConditionNames } from "../hooks/use-condition-names.ts";
import { useValueOptions } from "../hooks/use-value-options.ts";
import { useDraft } from "../hooks/use-draft.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useTopCategories } from "../hooks/use-top-categories.ts";
import { useSession } from "../session-store.ts";
import { pathOf } from "../utils/path-of.ts";
import { sharedConditions } from "../utils/shared-conditions.ts";
import { sharedValue } from "../utils/shared-value.ts";
import { withExcluded } from "../utils/with-excluded.ts";
import { withQuest } from "../utils/with-quest.ts";
import { withUnpriceable } from "../utils/with-unpriceable.ts";
import { withSharedConditions } from "../utils/with-shared-conditions.ts";

const MIXED = "*mixed*";

export function MultiItemPane() {
  const draft = useDraft();
  const checked = useSession((state) => state.checked);
  const editItems = useSession((state) => state.editItems);
  const categories = useTopCategories();
  const editable = useEditable();
  const names = useConditionNames();
  const valueOptions = useValueOptions();

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

  const excludedCount = items.filter((item) => item.excluded === true).length;
  const questCount = items.filter((item) => item.quest === true).length;
  const unpriceableCount = items.filter((item) => item.unpriceable === true).length;
  const shared = sharedConditions(items);
  const withExtras = items.filter((item) => item.conditions.length > shared.length).length;

  const setConditions = (next: readonly Condition[]) =>
    editItems(items.map((item) => withSharedConditions(item, shared, next)));

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

      <div className="grp">
        <h4>Excluded</h4>
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={!editable || excludedCount === items.length}
            onClick={() => editItems(items.map((item) => withExcluded(item, true)))}
          >
            Exclude all
          </button>
          <button
            type="button"
            className="btn"
            disabled={!editable || excludedCount === 0}
            onClick={() => editItems(items.map((item) => withExcluded(item, false)))}
          >
            Include all
          </button>
        </div>
        <p className="note">
          {excludedCount} of {items.length} are excluded.
        </p>
      </div>

      <div className="grp">
        <h4>Quest items</h4>
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={!editable || questCount === items.length}
            onClick={() => editItems(items.map((item) => withQuest(item, true)))}
          >
            Mark all
          </button>
          <button
            type="button"
            className="btn"
            disabled={!editable || questCount === 0}
            onClick={() => editItems(items.map((item) => withQuest(item, false)))}
          >
            Unmark all
          </button>
        </div>
        <p className="note">
          {questCount} of {items.length} are quest items. A quest item needs no listing.
        </p>
      </div>

      <div className="grp">
        <h4>Unpriceable</h4>
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={!editable || unpriceableCount === items.length}
            onClick={() => editItems(items.map((item) => withUnpriceable(item, true)))}
          >
            Mark all
          </button>
          <button
            type="button"
            className="btn"
            disabled={!editable || unpriceableCount === 0}
            onClick={() => editItems(items.map((item) => withUnpriceable(item, false)))}
          >
            Unmark all
          </button>
        </div>
        <p className="note">
          {unpriceableCount} of {items.length} are unpriceable. An unpriceable item needs no listing and is still drawn.
        </p>
      </div>

      <div className="grp">
        <h4>Conditions</h4>
        <ConditionsEditor
          own={shared}
          {...(editable ? { onChange: setConditions } : {})}
          note={
            withExtras === 0
              ? "These are the conditions every checked item has. An edit here applies to all of them."
              : `These are the conditions every checked item has. An edit here applies to all of them. ${withExtras} of them also have conditions of their own, which this leaves alone.`
          }
          names={names}
          valueOptions={valueOptions}
          level="item"
        />
      </div>
    </div>
  );
}
