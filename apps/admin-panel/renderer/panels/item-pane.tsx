import type { Item } from "../../api/taxonomy/types.ts";
import { ListingPicker } from "../components/listing-picker.tsx";
import { ConditionsEditor, type ResolvedView } from "../components/conditions-editor.tsx";
import { Segmented } from "../components/segmented.tsx";
import { useConditionNames } from "../hooks/use-condition-names.ts";
import { useValueOptions } from "../hooks/use-value-options.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useTopCategories } from "../hooks/use-top-categories.ts";
import { useSession } from "../session-store.ts";
import type { Flag } from "../types.ts";
import { fromValues } from "../utils/from-values.ts";
import { pathOf } from "../utils/path-of.ts";
import { priceHint } from "../utils/price-hint.ts";
import { replacesNote } from "../utils/replaces-note.ts";
import { withDisplayName } from "../utils/with-display-name.ts";
import { withExcluded } from "../utils/with-excluded.ts";
import { withFlag } from "../utils/with-flag.ts";
import { withListing } from "../utils/with-listing.ts";
import { withQuest } from "../utils/with-quest.ts";

type Tri = "sources" | "yes" | "no";

const TRI: readonly (readonly [Tri, string])[] = [
  ["sources", "Sources"],
  ["yes", "Yes"],
  ["no", "No"],
];

function toTri(value: boolean | undefined): Tri {
  if (value === undefined) return "sources";

  return value ? "yes" : "no";
}
const fromTri = (tri: Tri): boolean | undefined => (tri === "sources" ? undefined : tri === "yes");

const FLAGS: readonly (readonly [Flag, string])[] = [
  ["filterable", "Filterable"],
  ["tradable", "Tradable"],
  ["tradedOnExchange", "Traded on exchange"],
];

type YesNo = "yes" | "no";

const YES_NO: readonly (readonly [YesNo, string])[] = [
  ["no", "No"],
  ["yes", "Yes"],
];

export function ItemPane({
  item,
  resolved,
  resolveNote,
  hasVariants,
}: {
  readonly item: Item;
  readonly resolved?: ResolvedView;
  readonly resolveNote?: string;
  readonly hasVariants: boolean;
}) {
  const categories = useTopCategories();
  const names = useConditionNames();
  const valueOptions = useValueOptions();
  const editable = useEditable();
  const priceOptions = useSession((state) => state.priceOptions);
  const editItem = useSession((state) => state.editItem);
  const openDialog = useSession((state) => state.openDialog);
  const { classification } = item;
  const top = categories.find((node) => node.path === classification.category);
  const hint = priceHint(item, hasVariants);

  return (
    <div className="pane">
      {item.source === "authored" ? (
        <div className="subhead">
          <div className="title">
            <span className="flag authored">authored</span> Authored row
          </div>
          <div className="id">{replacesNote(item.replaces.length)}</div>
        </div>
      ) : null}
      <div className="grp">
        <div className="fld">
          <label htmlFor="row-name">Name</label>
          <input
            id="row-name"
            type="text"
            value={item.source === "ggg" ? (item.displayName ?? item.name) : item.name}
            placeholder={item.name}
            disabled={!editable}
            onChange={(event) => editItem(withDisplayName(item, event.target.value))}
          />
        </div>
        {item.source === "ggg" ? (
          <div className="fld">
            <label>RePoE name</label>
            <span>{item.name}</span>
          </div>
        ) : (
          <div className="fld">
            <label htmlFor="row-base-type">Base type</label>
            <input
              id="row-base-type"
              type="text"
              value={item.baseType}
              disabled={!editable}
              onChange={(event) => editItem({ ...item, baseType: event.target.value })}
            />
          </div>
        )}
        <div className="fld">
          <label>Metadata id</label>
          <span className="mono faint">{item.key}</span>
        </div>
      </div>

      <div className="grp">
        <h4>Classification</h4>
        <div className="fld">
          <label htmlFor="row-category">Category</label>
          <select
            id="row-category"
            value={classification.category}
            disabled={!editable}
            onChange={(event) =>
              editItem({ ...item, classification: { category: event.target.value, subcategory: null } })
            }
          >
            {top === undefined ? (
              <option value={classification.category}>{classification.category}</option>
            ) : null}
            {categories.map((node) => (
              <option key={node.path} value={node.path}>
                {node.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="row-subcategory">Subcategory</label>
          <select
            id="row-subcategory"
            value={classification.subcategory === null ? "" : pathOf(classification)}
            disabled={!editable}
            onChange={(event) =>
              editItem({
                ...item,
                classification: {
                  ...classification,
                  subcategory: event.target.value === "" ? null : (event.target.value.split("/")[1] ?? null),
                },
              })
            }
          >
            <option value="">— none —</option>
            {classification.subcategory !== null &&
            top?.children.every((child) => child.path !== pathOf(classification)) !== false ? (
              <option value={pathOf(classification)}>{classification.subcategory}</option>
            ) : null}
            {(top?.children ?? []).map((child) => (
              <option key={child.path} value={child.path}>
                {child.label}
              </option>
            ))}
          </select>
        </div>
        {item.source === "ggg" ? null : (
          <>
            <div className="fld top">
              <label htmlFor="row-reason">Reason</label>
              <textarea
                id="row-reason"
                rows={3}
                value={item.reason}
                disabled={!editable}
                onChange={(event) => editItem({ ...item, reason: event.target.value })}
              />
            </div>
            <div className="fld top">
              <label>Replaces</label>
              <div className="listval">
                {item.replaces.length === 0 ? <span className="faint">nothing — no source has it</span> : null}
                {item.replaces.map((key) => (
                  <span className="tag" key={key}>
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {item.source === "ggg" ? (
        <div className="grp">
          <h4>Overrides</h4>
          {FLAGS.map(([flag, label]) => (
            <div className="fld" key={flag}>
              <label>{label}</label>
              <Segmented
                value={toTri(item[flag])}
                options={TRI}
                disabled={!editable}
                onChange={(tri) => editItem(withFlag(item, flag, fromTri(tri)))}
              />
            </div>
          ))}
          <p className="note">Sources means take what the game data and the trade site say.</p>
        </div>
      ) : null}

      <div className="grp">
        <h4>Conditions</h4>
        <ConditionsEditor
          own={item.conditions}
          {...(editable ? { onChange: (conditions) => editItem({ ...item, conditions }) } : {})}
          {...(resolved === undefined ? {} : { resolved })}
          {...(resolveNote === undefined ? {} : { note: resolveNote })}
          names={names}
          row={fromValues(item)}
          level="item"
          valueOptions={valueOptions}
        />
      </div>

      <div className="grp">
        <h4>Price</h4>
        <div className="fld">
          <label>Quest item</label>
          <Segmented
            value={item.quest === true ? "yes" : "no"}
            options={YES_NO}
            disabled={!editable}
            onChange={(value) => editItem(withQuest(item, value === "yes"))}
          />
        </div>
        <div className="fld">
          <label htmlFor="row-listed">Listed as</label>
          <ListingPicker
            id="row-listed"
            placeholder={hint.placeholder}
            listing={item.listing}
            options={priceOptions}
            disabled={!editable}
            onPick={(listing) => editItem(withListing(item, listing))}
          />
        </div>
        <p className="note">
          {hint.note}
          {priceOptions.length === 0 ? " PoeWatch's listings did not download." : ""}
        </p>
      </div>

      {editable ? (
        <div className="grp">
          <h4>Actions</h4>
          <div className="row">
            <button type="button" className="btn" onClick={() => editItem(withExcluded(item, item.excluded !== true))}>
              {item.excluded === true ? "Include" : "Exclude"}
            </button>
            {item.source === "ggg" ? (
              <button type="button" className="btn" onClick={() => openDialog({ kind: "author", replaces: item.key })}>
                Author a replacement row…
              </button>
            ) : null}
          </div>
          {item.excluded === true ? <p className="note">Excluded rows are never drawn.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
