import { describeSample } from "@poe/filter-validate/describe-sample";
import type { BlindGroup, RejectedGroup } from "../../api/panel-api.ts";

/** One path's blind property or taken reject, with an example. */
export function FlaggedGroupRow({
  label,
  group,
  onOpen,
}: {
  readonly label: string;
  readonly group: BlindGroup | RejectedGroup;
  readonly onOpen: (key: string) => void;
}) {
  const { key, variant, item } = group.example;

  return (
    <div className="unfiltered">
      <div className="unfiltered-head">
        <span className="name">
          {group.path} · {label}
        </span>
        <span className="c mono">{group.count}</span>
        <button type="button" className="btn" onClick={() => onOpen(key)}>
          Open
        </button>
      </div>
      <p className="note mono">
        {variant === "" ? key : `${key} ${variant}`}: {describeSample(item)}
      </p>
    </div>
  );
}
