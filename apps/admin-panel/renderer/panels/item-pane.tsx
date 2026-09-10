import type { ResolvedCondition } from "../../api/taxonomy.resolve.api.ts";
import type { Item } from "../../api/taxonomy.types.ts";
import { ConditionsEditor, type ResolvedView } from "../components/conditions-editor.tsx";
import { Segmented } from "../components/segmented.tsx";
import { useConditionNames } from "../hooks/use-condition-names.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useTopCategories } from "../hooks/use-top-categories.ts";
import { useSession } from "../session-store.ts";
import type { Flag } from "../types.ts";
import { pathOf } from "../utils/path-of.ts";
import { withFlag } from "../utils/with-flag.ts";
import { withListing } from "../utils/with-listing.ts";
import { withListingName } from "../utils/with-listing-name.ts";

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

export function ItemPane({
  item,
  inherited,
  resolved,
  resolveNote,
  hasVariants,
}: {
  readonly item: Item;
  readonly inherited?: readonly ResolvedCondition[];
  readonly resolved?: ResolvedView;
  readonly resolveNote?: string;
  readonly hasVariants: boolean;
}) {
  const categories = useTopCategories();
  const names = useConditionNames();
  const editable = useEditable();
  const priceNames = useSession((state) => state.priceNames);
  const editItem = useSession((state) => state.editItem);
  const openDialog = useSession((state) => state.openDialog);
  const { classification } = item;
  const top = categories.find((node) => node.path === classification.category);

  return (
    <div className="pane">
      <div className="subhead">
        <div className="title">{item.name}</div>
        <div className="id">{item.key}</div>
      </div>

      <div className="grp">
        <h4>Classification</h4>
        {item.source === "ggg" ? null : (
          <div className="fld">
            <label htmlFor="row-name">Name</label>
            <input
              id="row-name"
              type="text"
              value={item.name}
              disabled={!editable}
              onChange={(event) => editItem({ ...item, name: event.target.value })}
            />
          </div>
        )}
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
          {...(inherited === undefined ? {} : { inherited })}
          {...(resolved === undefined ? {} : { resolved })}
          {...(resolveNote === undefined ? {} : { note: resolveNote })}
          names={names}
        />
      </div>

      <div className="grp">
        <h4>Price</h4>
        <div className="fld">
          <label htmlFor="row-listed">Listed as</label>
          <input
            id="row-listed"
            type="text"
            list="price-names"
            placeholder={item.name}
            value={item.listing?.name ?? ""}
            disabled={!editable}
            onChange={(event) => editItem(withListing(item, withListingName(item.listing, event.target.value)))}
          />
          <datalist id="price-names">
            {priceNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <p className="note">
          Empty means the row's own name.{hasVariants ? " This row has variants, so each variant's price is read instead." : ""}
          {priceNames.length === 0 ? " No PoeWatch name list is wired up yet — type the listing name." : ""}
        </p>
      </div>

      {item.source === "ggg" && editable ? (
        <div className="grp">
          <h4>Actions</h4>
          <button type="button" className="btn" onClick={() => openDialog({ kind: "author", replaces: item.key })}>
            Author a replacement row…
          </button>
        </div>
      ) : null}
    </div>
  );
}
