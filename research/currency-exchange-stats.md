# Currency Exchange stats — what the endpoint gives and what it derives

Reading GGG's aggregate Currency Exchange history, and the statistics that fall out
of it. Worked out 2026-08-18 against one live hour (`id=1787022000`, 2016 markets,
1.6 MB). Numbers below are from that single sample — directional, not a stable
baseline.

---

## The source

```
GET https://web.poecdn.com/api/currency-exchange[/<realm>][/<id>]
```

Public, no OAuth. `realm` is `xbox` | `sony` | `poe2`, omitted for PC PoE1. `id` is a
unix timestamp truncated to the hour.

- **A recent `id` works directly.** The docs describe the default as the oldest hour
  of history, which implies walking a river. It does not: request the hour you want
  and you get it. `next_change_id` came back as `id + 3600`.
- **The current hour is never available.** Go back 2 hours to be safe.
- **GGG reserves the right to prune old entries.** Any history longer than their
  retention window only exists if we poll and persist it.
- **All leagues arrive in one payload.** No server-side league filter.

One response is `{ next_change_id, markets: [...] }`. One market entry is
**one currency pair, one league, one hour**.

---

## The record

```json
{
  "league": "Standard",
  "market_id": "…CurrencyEssenceSpite4|…CurrencyRerollRare",
  "market_pair": ["…CurrencyEssenceSpite4", "…CurrencyRerollRare"],
  "volume_traded": { "…CurrencyEssenceSpite4": 48,   "…CurrencyRerollRare": 816  },
  "lowest_stock":  { "…CurrencyEssenceSpite4": 0,    "…CurrencyRerollRare": 5251 },
  "highest_stock": { "…CurrencyEssenceSpite4": 0,    "…CurrencyRerollRare": 5897 },
  "lowest_ratio":  { "…CurrencyEssenceSpite4": 1,    "…CurrencyRerollRare": 17   },
  "highest_ratio": { "…CurrencyEssenceSpite4": 1,    "…CurrencyRerollRare": 17   }
}
```

Every field is a two-key dict. **Read them as a pair, never a side.**

| Field | Kind | Meaning |
| --- | --- | --- |
| `volume_traded` | flow | Units that executed on each side, over the hour |
| `lowest_ratio` / `highest_ratio` | price band | Cheapest and dearest ratio seen, as a reduced integer fraction |
| `lowest_stock` / `highest_stock` | depth | Min and max open book on each side, sampled |

`market_id` is the two paths joined by `|`, sorted by GGG's internal hash. **Pair order
is arbitrary** — not base-first, not alphabetical.

Keys are metadata paths (`Metadata/Items/Currency/CurrencyRerollRare`), not trade-site
ids (`chaos`). `/api/trade/data/static` does **not** join to this; a metadata-path
mapping is a separate prerequisite.

---

## The invariant

`48 x 17 = 816`. The volume pair is the ratio, scaled by trade count. So:

```
VWAP = volume_traded[A] / volume_traded[B]
```

Checked across every market in the sample with volume on both sides: the VWAP lands
inside the `lowest_ratio`–`highest_ratio` band in **1620 of 1620** cases, zero
exceptions. That is the whole data model — **a price band, plus a volume-weighted
point inside it.**

### Ratio direction is a trap

Ratios are reduced fractions with no fixed unit side. **548 of 2016** markets had no
`1` on either side (`ScarabExpedition2 : Chaos = 3 : 2`). Always compute `a/b`.

"Lowest" means lowest *first-side-per-second-side*. Expressed as chaos-per-item that
inverts, so `lowest_ratio` becomes the **high** price whenever chaos is the second
element — and whether it is depends on that arbitrary hash order.

> Cortex/Chaos: `lowest_ratio` 1:60, `highest_ratio` 1:32.
> As Cortex-per-Chaos: 0.017 < 0.031, correctly ordered.
> As chaos-per-Cortex: a 32–60 band with VWAP 48.

**Rule: compute both endpoints, then `min`/`max` them. Never trust the field names to
survive the flip.**

---

## Degenerate rows

| Case | Count (of 2016) | Handling |
| --- | --- | --- |
| Zero volume on a side | 396 | Book existed, nothing traded. Stock is real, VWAP is not |
| All-zero ratios (`0:0`) | present | Guard the division |
| Stock 0 with volume > 0 | the example above | Not a contradiction — offers filled as fast as they appeared |

Stock is the standing book *sampled*; volume is what *executed*. A liquid pair can read
zero depth all hour.

---

## Derived statistics

Sample below is league **Allflame** only: 1327 markets, 894 distinct currencies.

### Chaos normalization is nearly free

**881 of 1327** markets have chaos as one side, and every one of the 894 currencies is
reachable from chaos:

| Hops from chaos | Currencies |
| --- | --- |
| 0 | 1 |
| 1 | 881 |
| 2 | 12 |

So a chaos-equivalent price exists for the entire universe from a single hour, direct
for 99% and via one intermediate for twelve. No path-finding infrastructure needed —
a direct lookup with a one-hop fallback covers it.

### Spread as a liquidity signal

`max(ratio) / min(ratio)` per market:

| Statistic | Value |
| --- | --- |
| Median | 1.235 |
| p90 | 3.000 |
| Max | 30.7 |
| Flat (exactly 1) | 254 of 1127 |

A median 23% intra-hour band is wide for a market maker and useless as a "price". The
long tail is thin markets where two trades an hour set both endpoints. **Spread width
is a confidence measure on the VWAP**, and should be carried alongside it rather than
discarded.

### Top chaos markets by volume, one hour

| Item | Chaos volume | VWAP (chaos) | Band |
| --- | --- | --- | --- |
| Divine Orb (`CurrencyModValues`) | 13,266,104 | 198.83 | 192–201 |
| `ScarabDivinationCardsNew1` | 827,033 | 22.82 | 21–24 |
| `CurrencyValdoPuzzleBox` | 753,488 | 246.08 | 222–255 |
| `DivinationCardDeck` | 506,473 | 3.29 | 2–4 |
| `ScarabUber7` | 505,178 | 424.52 | 404–444 |

Divine is 16x the next market by chaos turnover. Any index weighted by volume is
effectively a divine/chaos tracker unless deliberately capped.

---

## Storage shape

The natural grain is **one row per `(hour, league, market_id)`** with the six dicts
flattened to twelve columns plus the two currency paths. That makes VWAP, spread and
chaos-equivalent computed columns rather than stored ones.

Cost, from the sample: ~2000 rows/hour raw across all leagues, 1.6 MB/hour JSON,
roughly **14 GB/year** uncompressed. Columnar with dictionary-encoded metadata paths
should cut that by an order of magnitude — the paths are the bulk of the bytes and
there are under a thousand distinct values.

Filtering to one league at ingest drops ~35% and is irreversible. Given the volume is
modest, **store all leagues and filter at query time.**

---

## Open questions

1. **Do the ratio bounds come from executed trades or from the standing book?** The
   VWAP-inside-band result holds either way. It matters for whether an untraded
   market's band is a real quote.
2. **How is stock sampled?** Min/max over the hour implies polling at some interval
   GGG has not published. Determines whether depth is comparable across hours.
3. **What is the actual retention window?** Sets how urgently a backfill has to run.
4. **Does poecdn share the pathofexile.com rate-limit budget?** Response headers will
   say; `@poe/ggg/parse-rate-limit-headers` already reads them. Decides whether this
   poller can share the existing limiter or needs its own.
