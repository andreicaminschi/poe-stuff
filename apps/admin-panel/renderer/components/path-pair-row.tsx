import { describeSample } from "@poe/filter-validate/describe-sample";
import type { PathPair } from "../../api/panel-api.ts";

/** One own path against the path that took or matched its samples. */
export function PathPairRow({ pair, onOpen }: { readonly pair: PathPair; readonly onOpen: (key: string) => void }) {
  return (
    <div className="unfiltered">
      <div className="unfiltered-head">
        <span className="name">
          {pair.own}
          {" "}
          →
          {pair.other === ""
            ? "nothing"
            : pair.other}
        </span>
        <span className="c mono">{pair.count}</span>
        <button type="button" className="btn" onClick={() => onOpen(pair.example.ownKey)}>
          Open
        </button>
      </div>
      <p className="note mono">{describeSample(pair.example.item)}</p>
    </div>
  );
}
