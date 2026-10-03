import { useLayoutEffect, useRef, useState } from "react";
import { EditSeederButton } from "./edit-seeder-button.tsx";
import type { SeededItem } from "./generate-items.ts";
import { formatSeederKey } from "../seeder-key.ts";

const ROW_HEIGHT = 36;
const OVERSCAN = 10;

/** Lists the tags an item shows after its title: all but its own base type. */
const listOtherTags = (item: SeededItem): readonly string[] =>
  item.tags.filter((tag) => tag !== `basetype:${item.baseType.toLowerCase()}`);

function ItemRow({ item }: { readonly item: SeededItem }) {
  const rest = listOtherTags(item).join(", ");
  const title = item.name === undefined
    ? item.baseType
    : `${item.name}, ${item.baseType}`;

  return (
    <div className="item">
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
      <span className="from">{`${item.category} · ${item.seeder}`}</span>
    </div>
  );
}

/** Draws only the rows in view; every row is one line of fixed height. */
export function ItemList({ items }: { readonly items: readonly SeededItem[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const element = box.current;
    if (element === null) return;

    const measure = () => setHeight(element.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (box.current !== null) box.current.scrollTop = 0;
    setScrollTop(0);
  }, [items]);

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(items.length, Math.ceil((scrollTop + height) / ROW_HEIGHT) + OVERSCAN);

  return (
    <div className="vlist" ref={box} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      {items.length === 0
        ? <p className="empty">No items match.</p>
        : null}
      <div style={{ height: items.length * ROW_HEIGHT, position: "relative" }}>
        <div style={{ position: "absolute", top: first * ROW_HEIGHT, left: 0, right: 0 }}>
          {items.slice(first, last).map((item, at) => <ItemRow item={item} key={first + at} />)}
        </div>
      </div>
    </div>
  );
}
