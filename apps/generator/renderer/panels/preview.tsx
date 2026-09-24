import { useCategory } from "../hooks/use-category.ts";
import { usePlaced } from "../hooks/use-placed.ts";
import { useSession } from "../session-store.ts";
import { VERB_COPY } from "../utils/verb-copy.ts";
import { VerbColumn } from "./verb-column.tsx";

const SHOWN = 200;

/** Take, Check and Gamble side by side, then what no tier wanted. */
export function Preview() {
  const category = useCategory();
  const placed = usePlaced();
  const bucket = useSession((state) => state.bucket);
  if (category === undefined || placed === undefined) return null;

  const hints = category.record?.hints ?? [];
  const { unplaced } = placed;

  return (
    <div className="preview">
      {VERB_COPY.map((copy) => (
        <VerbColumn key={copy.verb} copy={copy} placements={placed.placed} hinted={copy.verb === "take" || hints.includes(copy.verb)} />
      ))}
      {bucket === null && unplaced.length > 0 ? (
        <div className="grp missed">
          <h4>
            <span className="dot" />
            <b>Unplaced</b>
            <span className="what">no tier wanted it · {unplaced.length}</span>
          </h4>
          {unplaced.slice(0, SHOWN).map((one) => (
            <div className="drop" key={`${one.item.key}|${one.item.variant ?? ""}`}>
              <span className="note">
                {one.item.name} — {one.reason}
              </span>
            </div>
          ))}
          {unplaced.length > SHOWN ? <p className="note">and {unplaced.length - SHOWN} more</p> : null}
        </div>
      ) : null}
    </div>
  );
}
