import type { ListingMatch } from "../../api/taxonomy/types.ts";

const RARITIES = ["normal", "magic", "rare", "unique"];

const when = <T>(value: T | undefined, text: (value: T) => string): string | undefined =>
  value === undefined ? undefined : text(value);

/** A listing query as one line a person can tell apart from its siblings. */
export function describeListing(listing: ListingMatch): string {
  const parts = [
    listing.name,
    when(listing.frame, (frame) => RARITIES[frame] ?? ""),
    when(listing.itemLevel, (level) => `ilvl ${level}`),
    when(listing.linkCount, (links) => (links === 0 ? "" : `${links}L`)),
    when(listing.gemLevel, (level) => `L${level}`),
    when(listing.gemQuality, (quality) => `Q${quality}`),
    listing.gemIsCorrupted === true ? "corrupted" : undefined,
    when(listing.mapTier, (tier) => `T${tier}`),
    when(listing.tier, (tier) => `tier ${tier}`),
    when(listing.passives, (passives) => `${passives} passives`),
    listing.influences,
    listing.synthesised === true ? "synth" : undefined,
  ];

  return parts.filter((part) => part !== undefined && part !== "").join(" · ");
}
