import type { Hit } from "../utils/search-placements.ts";
import { BeamBar } from "./beam-bar.tsx";
import { IconShape } from "./icon-shape.tsx";
import { LootLabel } from "./loot-label.tsx";

/** Search hits: where each item lands, drawn as its label. */
export function HitTable({ hits }: { readonly hits: readonly Hit[] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Tier</th>
          <th>Icon</th>
          <th>Item</th>
          <th>Category</th>
          <th>Verb</th>
          <th className="pr">Price</th>
        </tr>
      </thead>
      <tbody>
        {hits.map((hit) => (
          <tr key={hit.id} title={hit.reason}>
            <td>
              <span className={hit.won ? "pill won" : "pill"}>{hit.bucket}</span>
            </td>
            <td className="ic">
              <BeamBar beam={hit.style?.beam ?? null} />
              <IconShape icon={hit.style?.icon ?? null} />
            </td>
            <td className="it">
              {hit.style === undefined ? (
                <span className="note">
                  {hit.name} — {hit.reason}
                </span>
              ) : (
                <LootLabel style={hit.style} name={hit.name} />
              )}
            </td>
            <td className="cat">{hit.category}</td>
            <td className="cat">{hit.verb ?? ""}</td>
            <td className="pr">{hit.worth}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
