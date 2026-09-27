import type { PathPair } from "../../api/panel-api.ts";
import { PathPairRow } from "./path-pair-row.tsx";

/** One fall-through bucket, hidden when empty. */
export function PairSection({
  title,
  pairs,
  onOpen,
}: {
  readonly title: string;
  readonly pairs: readonly PathPair[];
  readonly onOpen: (key: string) => void;
}) {
  if (pairs.length === 0) return null;

  return (
    <div className="grp">
      <h4>{title}</h4>
      {pairs.map((pair) => (
        <PathPairRow key={`${pair.own}\n${pair.other}`} pair={pair} onOpen={onOpen} />
      ))}
    </div>
  );
}
