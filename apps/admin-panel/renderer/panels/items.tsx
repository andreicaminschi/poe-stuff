import { Fragment, useEffect, useMemo, useState } from "react";
import { ItemFlags } from "../components/item-flags.tsx";
import { useDraft } from "../hooks/use-draft.ts";
import { useRows } from "../hooks/use-rows.ts";
import { useSession } from "../session-store.ts";
import { displayName } from "../utils/display-name.ts";
import { titleCase } from "../utils/title-case.ts";

const LIMIT = 400;
const CHIPS = 6;

export function Items() {
  const draft = useDraft();
  const rows = useRows();
  const selection = useSession((state) => state.selection);
  const selectedKey = useSession((state) => state.selectedKey);
  const selectItem = useSession((state) => state.selectItem);
  const selectVariant = useSession((state) => state.selectVariant);
  const checked = useSession((state) => state.checked);
  const toggleChecked = useSession((state) => state.toggleChecked);
  const setChecked = useSession((state) => state.setChecked);
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => setShowAll(false), [selection]);

  const sorted = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matched =
      needle === ""
        ? rows
        : rows.filter(
            (row) =>
              displayName(row).toLowerCase().includes(needle) ||
              row.name.toLowerCase().includes(needle) ||
              row.key.toLowerCase().includes(needle),
          );

    return [...matched].sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }, [rows, filter]);

  const title =
    selection === undefined
      ? "All items"
      : selection
          .split("/")
          .map((part, at, parts) => draft?.categories[parts.slice(0, at + 1).join("/")]?.name ?? titleCase(part))
          .join(" › ");

  const shown = showAll ? sorted : sorted.slice(0, LIMIT);
  const checkedKeys = new Set(checked);
  const checkedHere = sorted.filter((row) => checkedKeys.has(row.key)).length;
  const allChecked = sorted.length > 0 && checkedHere === sorted.length;

  const toggleAll = () => {
    const here = new Set(sorted.map((row) => row.key));
    const others = checked.filter((key) => !here.has(key));
    setChecked(allChecked ? others : [...others, ...here]);
  };

  return (
    <div className="col items">
      <div className="head row">
        <label className="check-hit">
          <input
            type="checkbox"
            className="check"
            aria-label="Select all"
            checked={allChecked}
            disabled={sorted.length === 0}
            ref={(box) => {
              if (box !== null) box.indeterminate = checkedHere > 0 && !allChecked;
            }}
            onChange={toggleAll}
          />
        </label>
        <p className="label grow">
          {title} <span className="mono faint">{sorted.length}</span>
        </p>
        <input
          type="text"
          placeholder="Filter…"
          className="filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>
      <div className="body">
        {shown.map((row) => (
          <Fragment key={row.key}>
            <div
              role="button"
              tabIndex={0}
              className={`item${row.key === selectedKey ? " on" : ""}`}
              onClick={() => selectItem(row.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter") selectItem(row.key);
              }}
            >
              <label className="check-hit" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  className="check"
                  aria-label={`Select ${displayName(row)}`}
                  checked={checkedKeys.has(row.key)}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  onChange={() => toggleChecked(row.key)}
                />
              </label>
              <span className="name">{displayName(row)}</span>
              <span className="id">
                <bdi>{row.key}</bdi>
              </span>
              <span className="flags">
                <ItemFlags row={row} />
              </span>
            </div>
            {row.variants.length === 0 ? null : (
              <div
                className={`vars${row.key === selectedKey ? " on" : ""}`}
                onClick={() => selectItem(row.key, "variants")}
              >
                {row.variants.slice(0, CHIPS).map((variant) => (
                  <span
                    className="v"
                    key={variant.name}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectVariant(row.key, variant.name);
                    }}
                  >
                    {variant.name}
                  </span>
                ))}
                {row.variants.length > CHIPS ? (
                  <span className="v faint">… and {row.variants.length - CHIPS} more</span>
                ) : null}
              </div>
            )}
          </Fragment>
        ))}
        {!showAll && sorted.length > LIMIT ? (
          <button type="button" className="btn tiny ghost more" onClick={() => setShowAll(true)}>
            Show all {sorted.length}
          </button>
        ) : null}
        {sorted.length === 0 ? <p className="note pad">Nothing here.</p> : null}
      </div>
    </div>
  );
}
