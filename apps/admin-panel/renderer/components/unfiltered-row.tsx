import { describeSample } from "@poe/filter-validate/describe-sample";
import { useState } from "react";
import type { UnfilteredRow as Row } from "../../api/panel-api.ts";

/** One row's unfiltered samples, folded until opened. */
export function UnfilteredRow({ row, onOpen }: { readonly row: Row; readonly onOpen: (key: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="unfiltered">
      <div className="unfiltered-head">
        <button type="button" className="unfiltered-fold" onClick={() => setOpen(!open)}>
          <span className="caret">{open ? "▾" : "▸"}</span>
          <span className="name">{row.name}</span>
          <span className="c mono">{row.samples.length}</span>
        </button>
        <button type="button" className="btn" onClick={() => onOpen(row.key)}>
          Open
        </button>
      </div>
      {open ? (
        <ul className="samples">
          {row.samples.map((item, at) => (
            <li key={at} className="mono">
              {describeSample(item)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
