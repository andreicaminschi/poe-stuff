import { ICON_COLOURS, type Style } from "@poe/filter-style/types";
import { ICON_PATHS } from "../utils/icon-paths.ts";

const SCALES = [1, 0.8, 0.6];

/** A minimap icon as the game draws it, or an empty slot of the same size. */
export function IconShape({ icon, size = 20 }: { readonly icon: Style["icon"]; readonly size?: number }) {
  if (icon === null) return <svg className="icon none" width={size} height={size} viewBox="0 0 24 24" />;

  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={ICON_COLOURS[icon.colour]}
      style={{ transform: `scale(${SCALES[icon.size] ?? 1})` }}
    >
      <path d={ICON_PATHS[icon.shape]} />
    </svg>
  );
}
