import { Fragment, useEffect, useMemo, useState } from "react";
import { ItemFlags } from "../components/item-flags.tsx";
import { useDraft } from "../hooks/use-draft.ts";
import { useRows } from "../hooks/use-rows.ts";
import { useSession } from "../session-store.ts";
import { titleCase } from "../utils/title-case.ts";

const LIMIT = 400;
const CHIPS = 6;

export function Items() {
  const draft = useDraft();
  const rows = useRows();
  const selection = useSession((state) => state.selection);
  const selectedKey = useSession((state) => state.selectedKey);
  const selectItem = useSession((state) => state.selectItem);
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => setShowAll(false), [selection]);

  const sorted = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matched =
      needle === ""
        ? rows
        : rows.filter((row) => row.name.toLowerCase().includes(needle) || row.key.toLowerCase().includes(needle));

    return [...matched].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, filter]);

  const title =
    selection === undefined
      ? "Pick a category"
      : selection
          .split("/")
          .map((part, at, parts) => draft?.categories[parts.slice(0, at + 1).join("/")]?.name ?? titleCase(part))
          .join(" › ");

  const shown = showAll ? sorted : sorted.slice(0, LIMIT);

  return (
    <div className="col items">
      <div className="head row">
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
              <span className="name">{row.name}</span>
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
                  <span className="v" key={variant.name}>
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
