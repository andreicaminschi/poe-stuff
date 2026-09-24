import type { Style } from "@poe/filter-style/types";
import { BeamBar } from "./beam-bar.tsx";
import { IconShape } from "./icon-shape.tsx";
import { LootLabel } from "./loot-label.tsx";

export type DropRow = {
  readonly id: string;
  readonly bucket: string;
  readonly style: Style;
  readonly won?: boolean;
  readonly name?: string;
  readonly worth?: string;
  readonly reason?: string;
};

/** Tier, icon, item and price, one row per drop. A row with no name is an empty tier. */
export function DropTable({ rows }: { readonly rows: readonly DropRow[] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Tier</th>
          <th>Icon</th>
          <th>Item</th>
          <th className="pr">Price</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className={row.name === undefined ? "vacant" : ""} title={row.reason}>
            <td>
              <span className={row.won === true ? "pill won" : "pill"}>{row.bucket}</span>
            </td>
            <td className="ic">
              <BeamBar beam={row.style.beam} />
              <IconShape icon={row.style.icon} />
            </td>
            <td className="it">
              {row.name === undefined ? <span className="empty">no item in this tier</span> : <LootLabel style={row.style} name={row.name} />}
            </td>
            <td className="pr">{row.worth ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
