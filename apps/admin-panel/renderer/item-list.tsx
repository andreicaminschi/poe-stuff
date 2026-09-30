import { EditSeederButton } from "./edit-seeder-button.tsx";
import type { SeededItem } from "./generate-items.ts";
import { formatSeederKey } from "./seeder-key.ts";

/** Lists the tags an item shows after its title: all but its own base type. Low, Sonar 0. */
const listOtherTags = (item: SeededItem): readonly string[] =>
  item.tags.filter((tag) => tag !== `basetype:${item.baseType.toLowerCase()}`);

export function ItemList({ items }: { readonly items: readonly SeededItem[] }) {
  if (items.length === 0) return <p className="empty">No items match.</p>;

  return items.map((item, at) => {
    const rest = listOtherTags(item).join(", ");
    const title = item.name === undefined
      ? item.baseType
      : `${item.name}, ${item.baseType}`;

    return (
      <div className="item" key={at}>
        <span
          className="line"
          title={rest === ""
            ? title
            : `${title}, ${rest}`}
        >
          <strong>{title}</strong>
          {rest === ""
            ? ""
            : `, ${rest}`}
        </span>
        <EditSeederButton seederKey={formatSeederKey(item.category, item.seeder)} />
        <span className="sp" />
        <span className="from">
          {item.category}
          {" "}
          ·
          {" "}
          {item.seeder}
        </span>
      </div>
    );
  });
}
