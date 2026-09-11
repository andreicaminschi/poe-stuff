import type { Item } from "../../api/taxonomy/types.ts";

export function ItemFlags({ row }: { readonly row: Item }) {
  return (
    <>
      {row.source === "authored" ? <span className="flag">authored</span> : null}
      {row.source === "ggg" && row.filterable === false ? <span className="flag no">not filterable</span> : null}    </>
  );
}
