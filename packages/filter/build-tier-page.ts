import { readFile } from "node:fs/promises";
import type { Bucket } from "./types.ts";

/**
 * Inline `buckets-draft.json` into `tier-page.html` and return one standalone page.
 *
 * The page has to be a single file: it is served from disk and published as an artifact,
 * and neither can fetch a sibling JSON. So the data goes in the template's `__BUCKETS__`
 * slot, trimmed to the fields the page reads and rounded to two decimals — the full dump
 * is a few megabytes of price precision nobody looks at.
 */

const TEMPLATE = "packages/filter/tier-page.html";
const SOURCE = "packages/filter/buckets-draft.json";

/** Short keys, because the same names repeat nine thousand times in the payload. */
type Row = {
  id: string;
  fam: string;
  verb: string;
  tier: string;
  fl: number;
  ce: number;
  /** `vaalCeiling` and `vaalFloor` — what the gamble indicator is made of. */
  vc: number;
  vf: number;
  /** `thin`. */
  th: boolean;
  note: string;
  /** Verbatim `.filter` lines the block carries. Empty on everything derivable. */
  cond: readonly string[];
  /** `setBy` — which item the tier was cut on. */
  sb: string;
  /** `fromExchange` — whether that cut came off the Currency Exchange. */
  xf: boolean;
  ex: readonly string[];
};

const round = (value: number): number => Math.round(value * 100) / 100;

const toRow = (bucket: Bucket): Row => ({
  id: bucket.id,
  fam: bucket.family,
  verb: bucket.verb,
  tier: bucket.tier,
  fl: round(bucket.floor),
  ce: round(bucket.ceiling),
  vc: round(bucket.vaalCeiling),
  vf: round(bucket.vaalFloor),
  th: bucket.thin,
  note: bucket.note,
  cond: bucket.conditions,
  sb: bucket.setBy,
  xf: bucket.fromExchange,
  ex: bucket.examples.slice(0, 2),
});

/** The finished HTML, and how many buckets went into it. */
export async function buildTierPage(): Promise<{
  readonly html: string;
  readonly count: number;
}> {
  const [template, raw] = await Promise.all([
    readFile(TEMPLATE, "utf8"),
    readFile(SOURCE, "utf8"),
  ]);

  const rows = (JSON.parse(raw) as readonly Bucket[]).map(toRow);

  // `</script>` inside a string would close the tag it sits in. The escape survives JSON
  // parsing unchanged, so the data is identical either way.
  const payload = JSON.stringify(rows).replaceAll("</", "<\\/");
  const stamp = new Date().toISOString().slice(0, 10);

  return {
    html: template
      .replace("/*__BUCKETS__*/[]", payload)
      .replace("/*__STAMP__*/", `built ${stamp}`),
    count: rows.length,
  };
}
