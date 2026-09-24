import { HIDDEN, TIERS, WANT, type BucketName, type Placement } from "@poe/filter-style/types";
import { DropTable } from "../components/drop-table.tsx";
import { VerbOff } from "../components/verb-off.tsx";
import { useCategory } from "../hooks/use-category.ts";
import { useSession } from "../session-store.ts";
import { dearestFirst } from "../utils/dearest-first.ts";
import { dropRow } from "../utils/drop-row.ts";
import { onePerBucket } from "../utils/one-per-bucket.ts";
import type { VerbCopy } from "../utils/verb-copy.ts";

const SHOWN = 200;

type Props = { readonly copy: VerbCopy; readonly placements: readonly Placement[]; readonly hinted: boolean };

/** One verb's placements: one per tier under All, or every one in the selected tier. */
export function VerbColumn({ copy, placements, hinted }: Props) {
  const category = useCategory();
  const bucket = useSession((state) => state.bucket);
  if (category === undefined) return null;

  const { palette, disabled } = category.config;
  const mine = placements.filter((one) => one.verb === copy.verb);

  const body = () => {
    if (!hinted) {
      return <VerbOff head={`${copy.head} is off for ${category.name}.`} use={copy.use} note={`The taxonomy lists no ${copy.verb} hint for this category.`} />;
    }
    if (copy.verb === "gamble") {
      return <VerbOff head={`${copy.head} is on, but nothing prices a gamble yet.`} use={copy.use} note="The taxonomy carries no corruption outcomes to read." />;
    }
    if (mine.length === 0) {
      return <VerbOff head={`No ${copy.head} blocks for ${category.name}.`} use={copy.use} note="No item in this category reaches a tier this way." />;
    }
    if (bucket === null) {
      const names: readonly BucketName[] = [...TIERS.filter((name) => !disabled.includes(name)), WANT, HIDDEN];
      return <DropTable rows={onePerBucket(palette, names, mine)} />;
    }

    const inBucket = dearestFirst(mine.filter((one) => one.bucket === bucket));
    if (inBucket.length === 0) return <p className="empty">Nothing in {bucket} lands here.</p>;

    return (
      <>
        <DropTable rows={inBucket.slice(0, SHOWN).map((one, at) => dropRow(palette, one, at))} />
        {inBucket.length > SHOWN ? <p className="note">and {inBucket.length - SHOWN} more</p> : null}
      </>
    );
  };

  return (
    <div className={`grp ${copy.verb} ${mine.length === 0 ? "dark" : ""}`}>
      <h4>
        <span className="dot" />
        <b>{copy.head}</b>
        <span className="what">{copy.what}</span>
      </h4>
      {body()}
    </div>
  );
}
