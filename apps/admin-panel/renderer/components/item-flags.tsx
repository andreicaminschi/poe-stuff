import type { Item } from "../../api/taxonomy.types.ts";

export function ItemFlags({ row }: { readonly row: Item }) {
  if (row.source === "authored") return <span className="flag">authored</span>;

  return row.filterable === false ? <span className="flag no">not filterable</span> : null;
}
