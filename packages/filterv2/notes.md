# Notes

Known gaps in the item list. Each one is something the build gets wrong, or a decision it
has not made yet, written down where the next person looks rather than in a commit
message. [README.md](README.md) says what the package does; this says where it lies.

## Blighted maps and transfigured gems need special treatment

`/data/items` has two shapes for an entry, and the build only handles the first.

Most entries name themselves in `type`:

```json
{ "type": "Chronicle of Atzoatl" }
```

A variant does not. `type` holds the thing it is a variant *of* — or, for a blighted map,
a numeric id that names nothing at all — while the name a player would recognise sits in
`text`, and `disc` says which variant it is:

```json
{ "type": "Reap",  "text": "Reap of Butchery",                     "disc": "alt_x" }
{ "type": "1215",  "text": "Blighted Map (Haunted Mansion)",       "disc": "blighted" }
{ "type": "1215",  "text": "Blight-ravaged Map (Haunted Mansion)", "disc": "uberblighted" }
```

`@poe/ggg` carries all three fields through — `baseType`, `displayText`, `variantTag` —
but `collectTradeItems` keys a row on `baseType` alone. Three things follow:

- **A blighted map becomes a row named after a number.** Straight out of `items.json`:

  ```json
  "1215": {
    "key": "1215",
    "name": "1215",
    "category": "map",
    "sources": ["items"]
  }
  ```

- **Two variants sharing one `type` collapse into one row.** Blighted and Blight-ravaged
  both write to `1215`, and the second one wins. Nothing records that the first existed.

- **A transfigured gem is never seen under its own name.** `Reap of Butchery` goes into
  the row for `Reap`, so when the forum post names it as new, nothing is there to match
  and a second row appears with `"sources": ["forum"]` and no category.

None of these rows can be matched by a filter as they stand. A blighted map is selected by
`BlightedMap True` against the underlying map base, and a transfigured gem by its own
`BaseType`, which is exactly the string this build throws away.

Deciding what to do means deciding what a variant *is* here — a row of its own keyed by
`displayText`, or something the base row carries a list of. For a gem the first is clearly
right. For a blighted map neither is, because no filter matches one by name.

## A row nothing can name is a row nothing can join

When the exchange trades a metadata path RePoE cannot name, the row is kept under the
path's last segment with `name: null` and `absentInRepoe: true`:

```json
"AbyssPinnacleKeyGhastly": {
  "key": "AbyssPinnacleKeyGhastly",
  "name": null,
  "metadataPaths": ["Metadata/Items/MapFragments/AbyssPinnacleKeyGhastly"],
  "sources": ["exchange"]
}
```

That is the intended behaviour — a filter ignores it for free, because with no name there
is nothing for `BaseType` to match. The gap is what happens if the forum post names the
same item in the same run: the post creates a second row under the display name, and
nothing joins the two. RePoE is the only thing that maps a path to a name, so while RePoE
is behind there is nothing to join *with*. The leaf is not derivable from the name either
— word order differs, so neither a squash nor a prefix match is safe.

It has not happened in a real run yet. It will, on a launch day where a new currency
trades before RePoE catches up and the post names it.

## `market_pair` is asserted, not typed

`collectItems` reads the currency hour through a cast:

```ts
const markets = exchange.markets as readonly Market[];
```

`@poe/ggg` declares `CurrencyMarket` as `{ league: string }` and writes every other field
through untouched, on the grounds that it asserts nothing it has not verified. This
package needs `market_pair`, so it asserts the shape itself. A payload that changed that
field would be found at runtime, by a row that stopped appearing, rather than by the
compiler.

Adding `market_pair` to the service's type would remove the cast, and wants a real
response to check the shape against first.

## `items` is one bucket, and it holds two kinds of row

The output object is keyed by `item.key`, which is the display name for a named row and
the metadata leaf for a nameless one. So `"Chaos Orb"` and `"AbyssPinnacleKeyGhastly"` are
neighbours in the same object, and a consumer has to read `name === null` to tell them
apart.

Splitting them — `items` for the named, a second field for the rest — is agreed and
parked. The shape to move to:

```json
{ "items": { "Chaos Orb": {} }, "unnamed": { "AbyssPinnacleKeyGhastly": {} } }
```

## GGG is not cached, deliberately

`buildItemList` hands RePoE a `fileCache` and hands GGG nothing. The currency hour is the
point of the run and a cached one is a stale one; `/data/items` is cheap and moves with
every patch. RePoE is the opposite — a whole export in one download that only changes when
GGG ships — so it is the one that pays for a cache.

The cost is that a debugging loop re-fetches both GGG endpoints on every run. If that
becomes annoying, hand `createGGGService` a cache in the same shape and the service's own
hourly cache key does the rest.

## The model's answer is cached by text, not by thread

GGG edits an Item Filter Information post in place — same thread, new content. The stored
answer carries `textChecksum`, a hash of the extracted post text, and a search compares it
against what it just fetched. Same text, stored answer; different text, one model call.

What this does not catch: a post whose text is unchanged but whose *meaning* the model
read wrong the first time. Nothing re-reads a post to check the answer, and there is no
way to invalidate one short of deleting its file from `data/forum-posts/`.
