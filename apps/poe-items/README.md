# poe-items

**Not written yet.** This folder holds the intent, not the code.

Replaces [`packages/filterv2`](../../packages/filterv2), which is deprecated.

## What it will own

Every item the game can show, named and flagged, as one file. It merges four sources that
each know a different part of the answer:

| Source | Knows |
| --- | --- |
| GGG `/data/items` | everything the trade site will let you search for, except currency |
| the Currency Exchange | currency, hours before the trade site hears about it |
| RePoE `base_items.json` | the game's own item class, release state and tags |
| the league's Item Filter Information forum post | what this league renamed, added and removed |

**It carries no prices.** This answers what exists, not what anything is worth.

## What it has to get right

The POC's ordering is the part worth copying exactly:

1. Detect whether a league has launched that RePoE has not caught up with. Everything after
   reads differently depending on the answer — a RePoE that cannot name half the exchange
   is alarming on an ordinary Tuesday and expected on launch day.
2. Merge the trade site and the exchange. The exchange owns currency outright; taking both
   would mean two sources disagreeing with no way to say which is right.
3. Apply the forum post — renames, removals, the league's new items.
4. Fill from RePoE **last**, so the game's own export outranks whatever the post or the
   trade site claimed. That precedence is structural, not a `??` in one branch.

Its rows are immutable: every step returns a new item rather than writing into one it was
handed, so the compiler rejects the mutation instead of a reviewer catching it.

## What has to be decided first

- **A canonical item id.** Five sources name the same item five ways — GGG by name or base
  type, RePoE by metadata path, the exchange by metadata path, a `.filter` by its `BaseType`
  string, a copied item by its display text. Every join downstream crosses these. Rows that
  cannot be resolved are an output, not a dropped row: they are the league-break alarm.
- **Where the forum post comes from at all.** The POC fetched it through `@poe/ggg`, and
  those endpoints are gone — the service now covers the trade API and the Currency Exchange
  CDN only. The forum is not an API: GGG publishes announcements as threads and nothing
  else, so reading one means fetching HTML off the same host and the same per-IP budget as
  trade. Whatever does that has to be paced by the same limiter, or a challenge earned
  scraping the forum lands on `searchListings` too.
- **How the post is read once it is fetched.** The POC shells out to `claude -p` and stores
  the answer keyed by a checksum of the post text, because GGG edits these posts in place.
