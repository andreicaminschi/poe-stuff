import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { ListingMatch } from "../taxonomy/types.ts";

const FIELDS = ["passives", "gemLevel", "gemQuality", "gemIsCorrupted", "linkCount", "itemLevel", "mapTier", "tier"] as const;

// Synthesis lives in the icon.
const isSynthesised = (icon: string): boolean => {
  const segment = icon.split("/image/")[1]?.split("/")[0];
  if (segment === undefined) return false;

  return Buffer.from(segment, "base64url").toString("utf8").includes('"synthesised":true');
};

/** Every field that finds this one listing again. */
export function listingQuery(listing: ItemData): ListingMatch {
  const fields = listing as unknown as Readonly<Record<string, unknown>>;
  const present = FIELDS.filter((key) => fields[key] !== undefined && fields[key] !== null);

  return {
    name: listing.name,
    frame: listing.frame,
    ...Object.fromEntries(present.map((key) => [key, fields[key]])),
    ...(listing.influences === "" ? {} : { influences: listing.influences }),
    synthesised: isSynthesised(listing.icon),
  };
}
