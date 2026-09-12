/**
 * Whether a PoeWatch icon is a synthesised item's.
 *
 * PoeWatch has no field for it. The icon URL carries the game's render options as base64url
 * JSON, and a synthesised base's options say `"synthesised":true`.
 */
export function isSynthesised(icon: string): boolean {
  const segment = icon.split("/image/")[1]?.split("/")[0];
  if (segment === undefined) return false;

  return Buffer.from(segment, "base64url").toString("utf8").includes('"synthesised":true');
}
