import { ICON_COLOURS, type Style } from "@poe/filter-style/types";

/** A small upright beam, or an empty slot of the same size. */
export function BeamBar({ beam }: { readonly beam: Style["beam"] }) {
  if (beam === null) return <div className="beam none" />;

  return <div className="beam" style={{ background: `linear-gradient(to top, ${ICON_COLOURS[beam.colour]}, transparent)` }} />;
}
