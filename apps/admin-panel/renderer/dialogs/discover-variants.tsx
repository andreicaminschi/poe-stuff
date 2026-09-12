import { useEffect, useState } from "react";
import type { Form } from "../../api/panel-api.ts";
import type { Variant } from "../../api/taxonomy/types.ts";
import { ConditionsEditor } from "../components/conditions-editor.tsx";
import { Modal } from "../components/modal.tsx";
import { useConditionNames } from "../hooks/use-condition-names.ts";
import { useSelectedItem } from "../hooks/use-selected-item.ts";
import { useValueOptions } from "../hooks/use-value-options.ts";
import { useSession } from "../session-store.ts";
import { compareForms } from "../utils/compare-forms.ts";
import { describeListing } from "../utils/describe-listing.ts";
import { listingsOf } from "../utils/listings-of.ts";
import { displayName } from "../utils/display-name.ts";
import { formMatched } from "../utils/form-matched.ts";
import { formToVariant } from "../utils/form-to-variant.ts";
import { fromValues } from "../utils/from-values.ts";
import { sameListing } from "../utils/same-listing.ts";

type Found = { readonly form: Form; readonly variant: Variant; readonly checked: boolean };

const listingText = (variant: Variant): string => {
  const linked = listingsOf(variant.listing);

  return linked.length === 0 ? "none" : linked.map(describeListing).join(" + ");
};

export function DiscoverVariants() {
  const item = useSelectedItem();
  const names = useConditionNames();
  const valueOptions = useValueOptions();
  const editItem = useSession((state) => state.editItem);
  const closeDialog = useSession((state) => state.closeDialog);
  const [found, setFound] = useState<readonly Found[] | undefined>();
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const listingName = item === undefined ? undefined : (listingsOf(item.listing)[0]?.name ?? item.name);

  useEffect(() => {
    if (listingName === undefined) return;
    window.panel.getForms(listingName).then(
      (forms) => {
        const sorted = [...forms].sort(compareForms);
        setFound(sorted.map((form) => ({ form, variant: formToVariant(form, sorted), checked: false })));
      },
      (reason: unknown) => setError(String(reason)),
    );
  }, [listingName]);

  if (item === undefined) return null;

  const rows = found ?? [];
  const current = rows[selected];
  const update = (index: number, next: Partial<Found>) =>
    setFound(rows.map((row, at) => (at === index ? { ...row, ...next } : row)));
  const matched = (row: Found) => formMatched(row.variant, item.variants);
  const collides = (row: Found, index: number) =>
    rows.some(
      (other, at) =>
        at !== index && sameListing(listingsOf(other.variant.listing)[0], listingsOf(row.variant.listing)[0]),
    );
  const nameTaken = (row: Found, index: number) =>
    item.variants.some((variant) => variant.name === row.variant.name) ||
    rows.some((other, at) => at !== index && other.checked && other.variant.name === row.variant.name);
  const chosen = rows.filter((row) => row.checked);
  const blocked = rows.some((row, index) => row.checked && nameTaken(row, index));

  return (
    <Modal
      title={`Discover variants · ${displayName(item)}`}
      onClose={closeDialog}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={closeDialog}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={chosen.length === 0 || blocked}
            onClick={() => {
              editItem({ ...item, variants: [...item.variants, ...chosen.map((row) => row.variant)] });
              closeDialog();
            }}
          >
            Add {chosen.length} variants
          </button>
        </>
      }
    >
      {error === undefined ? null : <p className="err grp">{error}</p>}
      {found === undefined && error === undefined ? <p className="note grp">Reading PoeWatch…</p> : null}
      {found?.length === 0 ? <p className="note grp">PoeWatch lists nothing under {listingName}.</p> : null}
      {current === undefined ? null : (
        <div className="discover">
          <div className="forms">
            {rows.map((row, index) => (
              <div
                key={index}
                role="button"
                tabIndex={0}
                className={`variant${index === selected ? " on" : ""}${matched(row) ? " done" : ""}`}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setSelected(index);
                }}
              >
                <input
                  type="checkbox"
                  checked={row.checked}
                  disabled={matched(row)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => update(index, { checked: event.target.checked })}
                />
                <span className="vn">{row.variant.name}</span>
                <span className="vp">
                  {Math.round(row.form.mean)}c · {row.form.daily}/d
                </span>
              </div>
            ))}
          </div>
          <div className="vsel">
            <div className="vselcap">
              <span className="dot" />
              Editing <b>{current.variant.name}</b>
            </div>
            <div className="grp">
              <div className="fld">
                <label htmlFor="discover-name">Name</label>
                <input
                  id="discover-name"
                  type="text"
                  value={current.variant.name}
                  onChange={(event) => update(selected, { variant: { ...current.variant, name: event.target.value } })}
                />
              </div>
              {nameTaken(current, selected) ? <p className="err">A variant already has this name.</p> : null}
              <div className="fld">
                <label>Listed as</label>
                <span className="mono faint">{listingText(current.variant)}</span>
              </div>
              {matched(current) ? <p className="note">An existing variant already prices off this listing.</p> : null}
              {collides(current, selected) ? (
                <p className="note">Another form selects the same listing, so this one prices off the most-listed of them.</p>
              ) : null}
              {current.form.lowConfidence ? <p className="note">PoeWatch marks this price low confidence.</p> : null}
            </div>
            <div className="grp">
              <h4>Conditions</h4>
              <ConditionsEditor
                own={current.variant.conditions}
                onChange={(conditions) => update(selected, { variant: { ...current.variant, conditions } })}
                level="variant"
                names={names}
                row={fromValues(item)}
                valueOptions={valueOptions}
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
