import { ICON_COLOURS } from "@poe/filter-style/types";
import { ICON_PATHS } from "../utils/icon-paths.ts";
import { ICON, PAD, type Piled } from "../utils/pile-labels.ts";

/** One label on the floor, at full game size, with its icon inside on the left. */
export function GroundLabel({ drop }: { readonly drop: Piled }) {
  const { background, text, border, opacity, icon } = drop.style;
  const iconSize = Math.round(drop.px * ICON);

  return (
    <span
      className="ground"
      style={{
        left: drop.x,
        top: drop.y,
        width: drop.w,
        height: drop.h,
        fontSize: drop.px,
        padding: `0 ${drop.px * PAD}px`,
        background,
        color: text,
        borderColor: border,
        opacity,
      }}
    >
      {icon === null ? null : (
        <svg
          viewBox="0 0 24 24"
          width={iconSize}
          height={iconSize}
          fill={ICON_COLOURS[icon.colour]}
          style={{ marginRight: Math.round(drop.px * 0.3) }}
        >
          <path d={ICON_PATHS[icon.shape]} />
        </svg>
      )}
      {drop.name}
    </span>
  );
}
