# notes

Things the generator has to honour, found while building the catalog. Short entries, one
per thing learned.

## A league start must not touch the generator

The generator is code and the catalog is data, and a new league only ever changes the data.
Nothing about `3.30` may require an edit here.

That rules out the generator knowing what any category is. It cannot carry the fact that a
blighted map is `BlightedMap True`, that a transfigured gem is `TransfiguredGem True`, or
that a unique is matched by base plus `Rarity Unique` — every one of those is a fact about
the game, and the game is what changes.

So the catalog owes the generator the conditions, not just the names — the `.filter`
condition lines themselves, as data:

```
blighted-map    ->  Class == "Maps", BlightedMap True
skill-gem       ->  Class == "Skill Gems" "Support Gems", TransfiguredGem True
unique-armour   ->  Rarity Unique, BaseType == "<the base it rolls on>"
```

A category carries the lines every entry in it matches on. An entry carries its own when the
name will not do. The generator reads them and renders blocks, and knows nothing about what
any of them mean.

Not designed yet. Next thing to pick up.

## A unique is a lever on its base, not a row

On the ground a unique is its base with a rarity, and a filter names the base. So the
catalog makes no row for a unique. Every base carries `uniques`: one group per category path
— `unique`, and `unique/foulborn` — holding one listing per form PoeWatch lists on it:
`Headhunter`, `Foulborn Headhunter (Culling)`, `Lightpoacher (2 Sockets)`, `Headhunter (#%
increased Area of Effect)`, each with `meanPrice` and `corrupted`. Sixty uniques roll on more
than one base and appear under each.

The group's path is how the conditions reach the block. The taxonomy authors `Rarity Unique`,
`BaseType == from:name` and `Foulborn False` under `unique`, and `Foulborn True` under
`unique/foulborn`; the generator resolves the path the way it resolves a row's, and never
learns what foulborn is. The listings are prices and nothing a filter can ask for — the
generator tiers the group on the dearest uncorrupted one, and notes the cheapest and any
corruption outcome over the config's floor. Which forms a filter can tell apart, and how a
person says so, is an open question in `TODO.md`.

## Beasts are not filterable

A captured beast is a real item — `Item Class: Stackable Currency`, and the base type is the
species name, so `Bearded Shaman` drops and can be matched.

The problem is that the trade site lists species the game has no base type for. The client
answers `no basetypes found for "Alpine Shaman"` for a name `/data/items` lists and the
spectre table confirms, and nothing in either file separates it from `Bearded Shaman`. The
client is the only thing that knows.

So the whole `beast` category is marked `filterable: false` in the taxonomy. Silver keeps
the rows and writes no `beast.filterable.json`, and the generator must not write a
`BaseType` line for any of them.

NeverSink does the same thing from the other side: he never names a beast anywhere in his
filter, and catches all of them with one `Class == "Stackable Currency"` rule at the end of
the currency section.

Rarity does not separate them either. Tried, and it does not work:

```
Show
    Class == "Stackable Currency"
    Rarity Rare

Show
    Class == "Stackable Currency"
    Rarity Unique
```

Left here so nobody tries it twice. A beast still has to be caught the way NeverSink catches
it, by the class alone.

Itemised monsters are the same story under a different category name. `Barb Serpent` is
listed by the trade site, confirmed by the spectre table, and rejected by the client. The
`monster` category is marked `filterable: false` too.

The shape they share: the only game data naming the row is the spectre table, and a monster
name is not a base type.

That was every row the spectre table was the sole evidence for, so the table earned nothing
and it is out of the pipeline. Bronze no longer fetches `Spectres.json`. If spectres come
back it will be for what they are actually good for — a monster's stats — and not as proof
that a base type exists.

## Transfigured gems are a flag, not a name

`Absolution of Inspiring` is not a base type, and neither is `Frostblink of Wintry Blast`.
The client rejects both.

A transfigured gem is matched the way a blighted map is — by a condition:

```
TransfiguredGem True
Class == "Skill Gems" "Support Gems"
```

NeverSink does exactly that and names no transfigured gem anywhere in his filter.

The `of Trarthus` gems — `Bladefall of Trarthus`, `Storm Call of Trarthus` and the rest —
are the same thing under another name and are marked the same way.

The taxonomy marks `skill-gem` / `transfigured` and `skill-gem` / `trarthan` as
`filterable: false`. The other gem subcategories — active, support, vaal, awakened,
exceptional — still come through by name.

## A support gem's name is not its item's name

Path of Building's gem table stores the **skill** name for a support, not the item name. The
item is `Gluttony Support`; the skill is `Gluttony`. And `Gluttony` is also a unique belt.

```
PoB Gems.json:  SkillGemSupportGluttony  {"name":"Gluttony","support":true}
GGG accessory:  {"kind":"unique","name":"Gluttony","baseType":"Leather Belt"}
GGG gem:        {"kind":"base","baseType":"Gluttony Support"}
```

Nothing gem-shaped collides with a unique here. PoB's skill name does. Matching that table
on `name` tagged the unique belt as known to the game's data, which pushed it out of
`skipped.json` and into the filter as a base type that does not exist. `Pyre` is a unique
Sapphire Ring and `Pacifism` a unique Viridian Jewel, both the same way.

The catalog reads `baseTypeName` from that table instead. Every real gem item has one, and
the supports that have none are already in `base_items.json` under their proper
`... Support` name.

Names do collide across kinds, though. `Wildfire` is both an active skill gem and a unique
jewel, and the catalog keys by display name, so they are one row — flagged unique, and
filterable because the gem's base type is real.

## Royale bases duplicate half the export's names

PoE Royale was a battle-royale mode the game no longer runs, and its bases are still in
`base_items.json` — 167 of them, every one duplicating the name of a base that does drop.
`Leather Belt` was two ids, so every unique rolling on one was two rows.

Nothing in the data marks them. They read `release_state: "released"`, they inherit from the
ordinary abstract base, and only eight carry `not_for_sale` — a tag 769 real items carry
too, 414 of them maps. The only discriminator is `Royale` in the metadata id, and the
catalog matches on exactly that.

They are 165 of the 417 duplicated names in the export, and dropping them loses no name.

## Removed items still say they are released

`release_state` is not the field that says an item has left the game. Every graft and the
Fleshgraft read `released`, and the client answers `no basetype found for "Aegis Tulgraft"`
for all of them.

`item_class: "RemovedItem"` is what says it. Eighteen rows in the export carry it, and the
catalog treats them as not filterable on that alone — no hand-maintained list, because the
game's own data answers the question.
