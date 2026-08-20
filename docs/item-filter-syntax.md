# Item filter syntax

Summary of GGG's official *About Item Filters* page (pathofexile.com → Item Filters →
About). Source of truth for the `.filter` grammar: block keywords, operators, conditions
and actions. Badges (*PoE2-only*, *New*, *Deleted*, *Updated*) are copied from the page as
published.

## Blocks

A filter is a list of `Show` / `Hide` blocks, each holding conditions. All conditions in a
block must match for the block to match. Matching stops at the first matching block unless
it says `Continue`.

| Keyword | Meaning |
| --- | --- |
| `Show` | Items matching this block's conditions are shown. |
| `Hide` | Items matching are hidden. Normal filters only. |
| `Minimal` | Label shrunk to minimum size, transparent background. Ruthless filters only. |
| `Continue` | Matching does not stop at this block; later blocks keep applying. |
| `Import` | Splices another filter file in. `Import "X.filter" Optional` skips a missing file. |

```
Show
    Rarity >= Rare

Hide
    BaseType "Scroll of Wisdom"

Minimal
    BaseType "Scroll of Wisdom"
```

`Continue` example — hide everything dropped below level 85, except 6-socket items above
item level 80:

```
Hide
    ItemLevel < 85
    Continue
Show
    ItemLevel > 80
    Sockets 6
    PlayEffect Blue
```

```
Import "MyCustomRules.filter"
Import "MyOptionalRules.filter" Optional
```

## Operators

`=` equal · `!` not equal · `!=` not equal · `<=` less or equal · `>=` greater or equal ·
`<` less · `>` greater · `==` exact match.

## Conditions

| Name | Values | Description | Example |
| --- | --- | --- | --- |
| `AlternateQuality` | True/False | Items with Alternate Quality. | `AlternateQuality True` |
| `AlwaysShow` *(PoE2-only)* | True/False | Always-shown items. | `AlwaysShow True` |
| `AnyEnchantment` | True/False | Enchanted items. | `AnyEnchantment True` |
| `ArchnemesisMod` | Modifier name | Archnemesis modifier name. | `ArchnemesisMod "Toxic"` |
| `AreaLevel` | Numeric | Level of the area the item dropped in. Lets levelling sections switch themselves off on a high-level character. | `AreaLevel < 30` |
| `BaseArmour` | Numeric | Base Armour. | `BaseArmour > 500` |
| `BaseDefencePercentile` | Numeric | Average percentile of the base's defence values. Zero for non-equipment; 100 for equipment whose defences are nonrandom. | `BaseDefencePercentile >= 90` |
| `BaseEnergyShield` | Numeric | Base Energy Shield. | `BaseEnergyShield > 200` |
| `BaseEvasion` | Numeric | Base Evasion Rating. | `BaseEvasion >= 153` |
| `BaseType` | Item name | Base type name. | `BaseType "Thicket Bow"` |
| `BaseWard` | Numeric | Base Ward. | `BaseWard >= 20` |
| `BlightedMap` | True/False | Blighted maps. | `BlightedMap False` |
| `Class` | Item class name | Item class. | `Class Currency` |
| `Corrupted` | True/False | Corrupted items. | `Corrupted True` |
| `CorruptedMods` | Numeric | Number of corrupted modifiers. | `CorruptedMods >= 1` |
| `DropLevel` | Numeric | Level the base starts dropping at. | `DropLevel > 65` |
| `ElderItem` | True/False | Elder items. | `ElderItem True` |
| `ElderMap` | True/False | Elder-influenced maps. | `ElderMap False` |
| `EnchantmentPassiveNode` | Enchantment name | Cluster Jewel enchantment type. | `EnchantmentPassiveNode "Damage over Time"` |
| `EnchantmentPassiveNum` | Numeric | Cluster Jewel passive count. Reads only the "Adds X passive skills" mod. | `EnchantmentPassiveNum > 5` |
| `Exceptional` *(New)* | True/False | Exceptional gems. | `Exceptional True` |
| `Foulborn` | True/False | Foulborn items. | `Foulborn False` |
| `FracturedItem` | True/False | Fractured items. | `FracturedItem True` |
| `GemLevel` | Numeric | Gem level. | `GemLevel > 15` |
| `GemQualityType` *(Deleted)* | Superior, Divergent, Anomalous, Phantasmal | Gem quality type. | `GemQualityType Anomalous` |
| `HasCruciblePassiveTree` | True/False | Items carrying a Crucible passive tree. | `HasCruciblePassiveTree True` |
| `HasEaterOfWorldsImplicit` | Numeric | Eater of Worlds implicit tier: 1 Lesser, 2 Greater, 3 Grand, 4 Exceptional, 5 Exquisite, 6 Perfect. | `HasEaterOfWorldsImplicit >= 4` |
| `HasEnchantment` | Numeric, enchantment name | Specific enchantments. | `HasEnchantment "Enchantment Bane Damage 2"` |
| `HasExplicitMod` | Numeric, mod names | Mod names, with an optional count of how many must match. | `HasExplicitMod >=2 "of Haast" "of Tzteosh" "of Ephij"` |
| `HasImplicitMod` | True/False | At least one implicit modifier. | `HasImplicitMod True` |
| `HasInfluence` | Shaper, Elder, Crusader, Hunter, Redeemer, Warlord, None | Influenced items. | `HasInfluence Shaper` |
| `HasSearingExarchImplicit` | Numeric | Searing Exarch implicit tier, same 1–6 scale as Eater. | `HasSearingExarchImplicit >= 3` |
| `HasVaalUniqueMod` *(PoE2-only)* | True/False | Items with a Vaal Unique mod. | `HasVaalUniqueMod True` |
| `Height` | Numeric | Inventory height. | `Height <= 2` |
| `Identified` | True/False | Identified items. | `Identified True` |
| `Imbued` | True/False | Imbued gems. | `Imbued True` |
| `IsVaalUnique` *(PoE2-only)* | True/False | Vaal Unique items. | `IsVaalUnique True` |
| `ItemLevel` | Numeric | Item level. | `ItemLevel >= 65` |
| `LinkedSockets` | Numeric | Size of the largest linked socket group. | `LinkedSockets >= 5` |
| `MapTier` | Numeric | Map Tier. | `MapTier >= 15` |
| `MemoryStrands` | Numeric | An item's Memory Strands. | `MemoryStrands > 0` |
| `MirageMap` *(New)* | True/False | Mirage Maps. | `MirageMap True` |
| `Mirrored` | True/False | Mirrored items. | `Mirrored False` |
| `Quality` | Numeric | Quality. | `Quality > 15` |
| `Rarity` | Normal, Magic, Rare, Unique | Rarity. | `Rarity > Magic` |
| `Replica` | True/False | Replica uniques. | `Replica True` |
| `Scourged` | True/False | Scourged items. | `Scourged True` |
| `ShapedMap` | True/False | Shaped maps. | `ShapedMap True` |
| `ShaperItem` | True/False | Shaper items. | `ShaperItem True` |
| `SocketGroup` | Numeric + R/G/B/A/D/W | Linked socket groups by size and colour. The example wants 5+ linked with at least 3 green. | `SocketGroup >= 5GGG` |
| `Sockets` | Numeric + R/G/B/A/D/W | Socket count and colours, links ignored. | `Sockets >= 5GGG` |
| `StackSize` | Numeric | Currency stack size. | `StackSize >= 5` |
| `SynthesisedItem` | True/False | Synthesised items. | `SynthesisedItem True` |
| `TransfiguredGem` *(Updated)* | True/False, gem name | Transfigured gems by name, or `True` for any. | `TransfiguredGem "Leap Slam"` |
| `TwiceCorrupted` *(PoE2-only)* | True/False | Twice-corrupted items. | `TwiceCorrupted True` |
| `UberBlightedMap` | True/False | Blight-Ravaged maps. | `UberBlightedMap True` |
| `UnidentifiedItemTier` *(PoE2-only)* | Numeric | Unidentified tier of the item. | `UnidentifiedItemTier >= 4` |
| `Vestigial` *(New)* | True/False | Vestigial items. | `Vestigial True` |
| `WaystoneTier` *(PoE2-only)* | Numeric | Waystone tier. | `WaystoneTier >= 15` |
| `Width` | Numeric | Inventory width. | `Width = 1` |
| `ZanaMemory` | True/False | Zana Memory maps. | `ZanaMemory True` |

Socket colour codes: `R` red, `G` green, `B` blue, `A` abyss, `D` delve, `W` white.

## Actions

Actions change the label, the minimap, the beam and the sound of a matched drop.

### Drop sound

| Name | Values | Description |
| --- | --- | --- |
| `PlayAlertSound` | Id 1–16, Volume 0–300 (default 50) | Built-in alert sound. `None` disables. `PlayAlertSound 1 100` |
| `PlayAlertSoundPositional` | Id 1–16, Volume 0–300 (default 50) | Same, played at the item's 3D location. `PlayAlertSoundPositional 16 50` |
| `CustomAlertSound` | File name or path, Volume 0–300 (default 100) | Custom file; several separated by `;` picks one at random. Overrides both `PlayAlertSound` forms. `"None"` disables. `CustomAlertSound "Map.mp3"` |
| `CustomAlertSoundOptional` | File name or path, Volume 0–300 (default 100) | Same, but a missing file makes the line a no-op instead of overriding the built-in sound. |
| `DisableDropSound` | — | Silences the sound the item makes hitting the ground during its drop animation. |
| `EnableDropSound` | — | Restores it. |
| `DisableDropSoundIfAlertSound` | — | Silences the drop sound only when an alert sound is set. A separate flag from `DisableDropSound`. |
| `EnableDropSoundIfAlertSound` | — | Restores that case. |

### Everything else

| Name | Values | Description |
| --- | --- | --- |
| `MinimapIcon` | Size 0–2, Colour, Shape | Minimap icon. `-1` disables. `MinimapIcon 2 Cyan Diamond` |
| `PlayEffect` | Colour, optional `Temp` | Beam of light over the drop. `Temp` shows it only as the item drops, otherwise it stays. `None` disables. `PlayEffect Red Temp` |
| `SetBackgroundColor` | R,G,B 0–255, A 0–255 (default 240) | Label background. `SetBackgroundColor 255 255 255 255` |
| `SetBorderColor` | R,G,B 0–255, A 0–255 (default 255) | Label border. `SetBorderColor 255 0 0` |
| `SetFontSize` | 1–45 | Label font size. `SetFontSize 30` |
| `SetTextColor` | R,G,B 0–255, A 0–255 (default 255) | Label text. Ruthless filters need alpha 80 or above. `SetTextColor 0 0 0` |

Icon and beam colours: Red, Green, Blue, Brown, White, Yellow, Cyan, Grey, Orange, Pink,
Purple.
Icon shapes: Circle, Diamond, Hexagon, Square, Star, Triangle, Cross, Moon, Raindrop,
Kite, Pentagon, UpsideDownHouse.
