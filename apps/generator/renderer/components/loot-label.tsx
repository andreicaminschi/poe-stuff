import type { Style } from "@poe/filter-style/types";

/** An item's name drawn the way the filter styles its label, scaled down to fit a table. */
export function LootLabel({ style, name }: { readonly style: Style; readonly name: string }) {
  return (
    <span
      className="loot"
      style={{
        background: style.background,
        color: style.text,
        borderColor: style.border,
        fontSize: Math.round(style.fontSize * 0.44) + 5,
        opacity: style.opacity,
      }}
    >
      {name}
    </span>
  );
}
