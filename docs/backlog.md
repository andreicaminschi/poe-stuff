# Backlog

Ideas not yet decided or built. Unlike `techdebt.md` — which names what the repo knowingly
does today and what undoing it costs — an entry here is something nobody has started. One
entry per idea; move it out (into a plan, a taxonomy record, code) once it is picked up.

## Replicas shouldn't set a price

Replicas cannot drop, so a replica listing should not count toward a row's price. Better:
the catalog should expose replicas with an `isReplica` flag rather than pricing them at all.

## High-variance items need their own category

Some items carry too wide a price spread to classify normally — `Forbidden Flame`/`Forbidden
Flesh`, `Nemesis` (shako), and others like them. They need a category of their own rather than
being priced and tiered the way an ordinary unique is.

## A "low confidence" toggle

Something like `Small Life Flask` reaching T0 suggests troll listings are getting through.
PoeWatch exposes a `lowConfidence` flag per listing and the catalog now carries it. Whatever
writes the filter should let the user include low-confidence listings, off by default.

## A price-spike signal

If PoeWatch exposes how much an item's price has moved recently, surface that — a way to see
an item has shot up a lot, not just where it landed.

## Per-category "always show"

Some categories should be configurable to always show regardless of price — e.g. "show me
every scarab, no matter what." Not modeled by the current tier system, which hides anything
under a tier's floor.
