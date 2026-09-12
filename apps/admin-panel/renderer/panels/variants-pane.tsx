import { useEffect, useState } from "react";
import type { Item, Resolution, Variant } from "../../api/taxonomy/types.ts";
import { ComboBox } from "../components/combo-box.tsx";
import { ConditionsEditor } from "../components/conditions-editor.tsx";
import { useConditionNames } from "../hooks/use-condition-names.ts";
import { useValueOptions } from "../hooks/use-value-options.ts";
import { useEditable } from "../hooks/use-editable.ts";
import { useSession } from "../session-store.ts";
import { conditionOrigins } from "../utils/condition-origins.ts";
import { displayName } from "../utils/display-name.ts";
import { fromValues } from "../utils/from-values.ts";
import { withListing } from "../utils/with-listing.ts";
import { withListingName } from "../utils/with-listing-name.ts";

const freshName = (list: readonly Variant[]): string => {
  const taken = new Set(list.map((variant) => variant.name));
  let n = list.length + 1;
  while (taken.has(`variant ${n}`)) n += 1;
  return `variant ${n}`;
};

export function VariantsPane({
  item,
  resolutions,
}: {
  readonly item: Item;
  readonly resolutions?: readonly Resolution[];
}) {
  const names = useConditionNames();
  const valueOptions = useValueOptions();
  const editable = useEditable();
  const editItem = useSession((state) => state.editItem);
  const priceOptions = useSession((state) => state.priceOptions);
  const { variants } = item;
  const [selected, setSelected] = useState<string | undefined>(variants[0]?.name);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!variants.some((variant) => variant.name === selected)) setSelected(variants[0]?.name);
  }, [variants, selected]);

  const change = (next: readonly Variant[]) => editItem({ ...item, variants: next });
  const index = variants.findIndex((variant) => variant.name === selected);
  const current = variants[index];
  const update = (next: Variant) => {
    change(variants.map((variant, at) => (at === index ? next : variant)));
    if (next.name !== current?.name) setSelected(next.name);
  };
  const duplicate = current !== undefined && variants.filter((variant) => variant.name === current.name).length > 1;
  const resolution = resolutions?.find((candidate) => candidate.variant === current?.name);
  const needle = filter.trim().toLowerCase();

  return (
    <div className="pane">
      <div className="subhead">
        <div className="title">{displayName(item)}</div>
        <div className="id">
          {variants.length === 0 ? "No variants. The row resolves once, as itself." : `${variants.length} variants`}
        </div>
      </div>

      <div className="grp">
        <h4>Variants</h4>
        {variants.length > 8 ? (
          <input
            type="text"
            placeholder="Filter…"
            className="gap"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        ) : null}
        {variants
          .filter((variant) => needle === "" || variant.name.toLowerCase().includes(needle))
          .map((variant) => (
            <div
              key={variant.name}
              role="button"
              tabIndex={0}
              className={`variant${variant.name === selected ? " on" : ""}`}
              onClick={() => setSelected(variant.name)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setSelected(variant.name);
              }}
            >
              <span className="vn">{variant.name}</span>
              <span className="vp">{variant.conditions.length} cond.</span>
              {editable ? (
                <button
                  type="button"
                  className="btn icon"
                  title="Delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    change(variants.filter((other) => other.name !== variant.name));
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        {editable ? (
          <button
            type="button"
            className="btn tiny ghost wide"
            onClick={() => {
              const created: Variant = { name: freshName(variants), conditions: [] };
              change([...variants, created]);
              setSelected(created.name);
            }}
          >
            + Variant
          </button>
        ) : null}
      </div>

      {current === undefined ? null : (
        <div className="vsel">
          <div className="vselcap">
            <span className="dot" />
            Editing <b>{current.name}</b>
          </div>
          <div className="grp">
            <div className="fld">
              <label htmlFor="variant-name">Name</label>
              <input
                id="variant-name"
                type="text"
                value={current.name}
                disabled={!editable}
                onChange={(event) => update({ ...current, name: event.target.value })}
              />
            </div>
            {duplicate ? <p className="err">Two variants share this name.</p> : null}
            <div className="fld">
              <label htmlFor="variant-listed">Listed as</label>
              <ComboBox
                id="variant-listed"
                placeholder="the row's listing"
                value={current.listing?.name ?? ""}
                options={priceOptions}
                disabled={!editable}
                onChange={(name) => update(withListing(current, withListingName(current.listing, name)))}
              />
            </div>
            <p className="note">Empty inherits the row's listing name.</p>
          </div>
          <div className="grp">
            <h4>Conditions</h4>
            <ConditionsEditor
              own={current.conditions}
              {...(editable ? { onChange: (conditions) => update({ ...current, conditions }) } : {})}
              {...(resolution === undefined
                ? {}
                : {
                    resolved: {
                      label: "Conditions applied to this variant",
                      conditions: resolution.conditions,
                      removed: resolution.removed,
                      problems: resolution.problems,
                      origins: conditionOrigins(item.classification, displayName(item), current.name),
                    },
                  })}
              level="variant"
              names={names}
              row={fromValues(item)}
              valueOptions={valueOptions}
            />
          </div>
        </div>
      )}
    </div>
  );
}
