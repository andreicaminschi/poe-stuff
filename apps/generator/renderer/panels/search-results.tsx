import { useMemo } from "react";
import { HitTable } from "../components/hit-table.tsx";
import { useAllPlaced } from "../hooks/use-all-placed.ts";
import { useSession } from "../session-store.ts";
import { searchPlacements } from "../utils/search-placements.ts";

const SHOWN = 200;

/** Every item matching the search, in every tier it lands in, across every category. */
export function SearchResults() {
  const categories = useAllPlaced();
  const query = useSession((state) => state.query);
  const hits = useMemo(() => searchPlacements(categories, query), [categories, query]);

  return (
    <div className="results">
      <h4 className="label">
        {hits.length} {hits.length === 1 ? "result" : "results"} for “{query.trim()}”
      </h4>
      {hits.length === 0 ? <p className="empty">No item name holds that text.</p> : <HitTable hits={hits.slice(0, SHOWN)} />}
      {hits.length > SHOWN ? <p className="note">and {hits.length - SHOWN} more. Type more of the name to narrow it.</p> : null}
    </div>
  );
}
