import { ICON_COLOURS } from "@poe/filter-style/types";
import type { Piled } from "../utils/pile-labels.ts";

const HEIGHT = 280;

/** The beam rising from where an item fell, or nothing when its tier has none. */
export function GroundBeam({ drop }: { readonly drop: Piled }) {
  if (drop.style.beam === null) return null;

  const colour = ICON_COLOURS[drop.style.beam.colour];
  return (
    <div
      className="shaft"
      style={{ left: drop.gx - 4, top: drop.gy - HEIGHT + 20, height: HEIGHT, background: `linear-gradient(to top, ${colour}, transparent)` }}
    />
  );
}
