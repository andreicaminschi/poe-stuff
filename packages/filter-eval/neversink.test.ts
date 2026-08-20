import { describe, it, expect } from "@jest/globals";
import { evaluateFilter } from "./evaluate-filter.ts";
import { parseFilter } from "./parse-filter.ts";
import type { FilterItem } from "./filter-ast.ts";

/**
 * The parser and the evaluator against real filter text.
 *
 * Every fixture below is lifted from `packages/filter/neversink-sample.filter`, tabs and
 * trailing header comments included, so these tests fail if the grammar drifts away from
 * what a filter people actually run looks like. The two grammar rules the syntax doc leaves
 * out — `Rarity` taking a list of values, and a comment trailing a block header — were both
 * found here rather than in the doc.
 *
 * The sample carries no `#@` notes of its own, so the fixtures that need to say which block
 * matched have one `#@ id=` line added per block, named after the `$tier->` the sample
 * already writes in its header comment. Nothing else is changed.
 */

/** From the "All Rules - Including Gold" section. A ladder, richest stack first. */
const GOLD = `Show # %H7 $type->gold $tier->stack3
	StackSize >= 3001
	BaseType == "Gold"
	#@ id=gold-stack3
	SetFontSize 45
	SetTextColor 235 200 110 255
	PlayAlertSound 2 300
	PlayEffect Orange
	MinimapIcon 1 Yellow Cross

Show # %H6 $type->gold $tier->stack2
	StackSize >= 500
	BaseType == "Gold"
	#@ id=gold-stack2
	SetFontSize 45
	PlayEffect Orange Temp
	MinimapIcon 1 White Cross

Show # %H5 $type->gold $tier->stack1
	StackSize >= 150
	BaseType == "Gold"
	#@ id=gold-stack1
	SetFontSize 40
	MinimapIcon 2 Grey Cross

Show # %H5 $type->gold $tier->stacklvl1
	StackSize >= 50
	BaseType == "Gold"
	AreaLevel <= 68
	#@ id=gold-stacklvl1
	SetFontSize 40
	MinimapIcon 2 Grey Cross

Show # %H4 $type->gold $tier->anyother
	BaseType == "Gold"
	#@ id=gold-anyother
	SetFontSize 35`;

/** From "All Rules - Highest priority - DANGER ZONE". Verbatim, base-type list and all. */
const SIX_LINK = `Show # %D8 $type->6l $tier->hightier
	Mirrored False
	Corrupted False
	LinkedSockets 6
	ItemLevel >= 75
	Rarity Normal Magic Rare
	BaseType == "Apex Cleaver" "Arcane Vestment" "Assassin's Garb" "Astral Leather" "Banishing Blade" "Battery Staff" "Carnal Armour" "Conquest Lamellar" "Despot Axe" "Destiny Leather" "Eventuality Rod" "Exquisite Leather" "Full Dragonscale" "Full Wyvernscale" "General's Brigandine" "Gladiator Plate" "Glorious Plate" "Grand Ringmail" "Grove Bow" "Harbinger Bow" "Impact Force Propagator" "Imperial Bow" "Ivory Bow" "Legion Plate" "Maraketh Bow" "Marshall's Brigandine" "Necrotic Armour" "Nightweave Robe" "Paladin's Hauberk" "Royal Plate" "Sacred Chainmail" "Sadist Garb" "Saint's Hauberk" "Saintly Chainmail" "Sanguine Raiment" "Short Bow" "Solarine Bow" "Spine Bow" "Supreme Leather" "Syndicate's Garb" "Thicket Bow" "Titan Plate" "Torturer Garb" "Triumphant Lamellar" "Twilight Regalia" "Vaal Regalia" "Zodiac Leather"
	SetFontSize 45
	SetTextColor 255 255 255 255
	SetBackgroundColor 200 0 0 255
	PlayAlertSound 1 300
	PlayEffect Red
	MinimapIcon 0 Red Diamond

Show # %D5 $type->6l $tier->others
	LinkedSockets 6
	Rarity Normal Magic Rare
	SetFontSize 45`;

/** From "Hide rare corrupted unidentified gear with no implicits". Verbatim. */
const HIDE_LAYER = `Hide # $type->hidelayer $tier->corruptedrares
	Corrupted True
	Identified False
	CorruptedMods 0
	ItemLevel >= 68
	Rarity Rare
	Class == "Body Armours" "Boots" "Bows" "Claws" "Daggers" "Gloves" "Helmets" "One Hand Axes" "One Hand Maces" "One Hand Swords" "Quivers" "Rune Daggers" "Sceptres" "Shields" "Staves" "Thrusting One Hand Swords" "Two Hand Axes" "Two Hand Maces" "Two Hand Swords" "Wands" "Warstaves"
	SetFontSize 35
	SetBorderColor 0 0 0

Hide # $type->hidelayer $tier->mirroredrares
	Mirrored True
	Identified False
	CorruptedMods 0
	ItemLevel >= 68
	Rarity Rare
	Class == "Body Armours" "Boots" "Bows" "Claws" "Daggers" "Gloves" "Helmets" "One Hand Axes" "One Hand Maces" "One Hand Swords" "Quivers" "Rune Daggers" "Sceptres" "Shields" "Staves" "Thrusting One Hand Swords" "Two Hand Axes" "Two Hand Maces" "Two Hand Swords" "Wands" "Warstaves"
	SetFontSize 35
	SetBorderColor 0 0 0`;

/**
 * From "Endgame - Rare - Decorators". Every block continues, so one item collects a border
 * colour from one block and a text colour from another — which is the whole reason the
 * evaluator merges instead of stopping. Two blocks in the middle are commented out in the
 * sample and are kept that way here.
 */
const DECORATORS = `Show # $type->decorators->rareeg $tier->largerares
	Width >= 2
	Height >= 3
	ItemLevel >= 68
	Rarity Rare
	Class == "Amulets" "Belts" "Body Armours" "Boots" "Bows" "Claws" "Daggers" "Gloves" "Helmets" "One Hand Axes" "One Hand Maces" "One Hand Swords" "Quivers" "Rings" "Rune Daggers" "Sceptres" "Shields" "Staves" "Thrusting One Hand Swords" "Two Hand Axes" "Two Hand Maces" "Two Hand Swords" "Wands" "Warstaves"
	#@ id=largerares
	SetBorderColor 0 0 0 255
	Continue

Show # $type->decorators->rareeg $tier->mediumrares1
	Width 1
	Height >= 3
	ItemLevel >= 68
	Rarity Rare
	Class == "Amulets" "Belts" "Body Armours" "Boots" "Bows" "Claws" "Daggers" "Gloves" "Helmets" "One Hand Axes" "One Hand Maces" "One Hand Swords" "Quivers" "Rings" "Rune Daggers" "Sceptres" "Shields" "Staves" "Thrusting One Hand Swords" "Two Hand Axes" "Two Hand Maces" "Two Hand Swords" "Wands" "Warstaves"
	#@ id=mediumrares1
	SetBorderColor 180 180 180 255
	Continue

Show # $type->decorators->rareeg $tier->tinyrares
	Width <= 2
	Height 1
	ItemLevel >= 68
	Rarity Rare
	Class == "Amulets" "Belts" "Body Armours" "Boots" "Bows" "Claws" "Daggers" "Gloves" "Helmets" "One Hand Axes" "One Hand Maces" "One Hand Swords" "Quivers" "Rings" "Rune Daggers" "Sceptres" "Shields" "Staves" "Thrusting One Hand Swords" "Two Hand Axes" "Two Hand Maces" "Two Hand Swords" "Wands" "Warstaves"
	#@ id=tinyrares
	SetBorderColor 50 200 50 255
	Continue

#Show # $type->decorators->rareeg $tier->ilvl68
#	ItemLevel >= 68
#	Rarity Rare
#	Continue

#Show # $type->decorators->rareeg $tier->ilvl75
#	ItemLevel >= 75
#	Rarity Rare
#	SetTextColor 245 190 0 255
#	Continue

Show # $type->decorators->rareeg $tier->fourlinkedrares
	LinkedSockets >= 4
	ItemLevel >= 68
	Rarity Rare
	Class == "Amulets" "Belts" "Body Armours" "Boots" "Bows" "Claws" "Daggers" "Gloves" "Helmets" "One Hand Axes" "One Hand Maces" "One Hand Swords" "Quivers" "Rings" "Rune Daggers" "Sceptres" "Shields" "Staves" "Thrusting One Hand Swords" "Two Hand Axes" "Two Hand Maces" "Two Hand Swords" "Wands" "Warstaves"
	#@ id=fourlinkedrares
	SetBorderColor 0 140 240 255
	Continue

Show # $type->decorators->rareeg $tier->topilvl83
	ItemLevel >= 83
	Rarity Rare
	Class == "Claws" "Daggers" "One Hand Axes" "One Hand Maces" "One Hand Swords" "Thrusting One Hand Swords" "Two Hand Axes" "Two Hand Maces" "Two Hand Swords" "Warstaves"
	#@ id=topilvl83
	SetTextColor 245 190 0 255
	Continue

Show # $type->decorators->rareeg $tier->topilvl84
	ItemLevel >= 84
	Rarity Rare
	Class == "Rings" "Rune Daggers" "Sceptres" "Staves" "Wands"
	#@ id=topilvl84
	SetTextColor 245 190 0 255
	Continue`;

/** From "Sockets and Links". `SocketGroup "RGB"` is the chromatic recipe. */
const CHROMATIC = `Show # %D5 $type->socketslinks $tier->rgbsmall1
	Width 2
	Height 2
	Rarity Normal Magic Rare
	SocketGroup "RGB"
	#@ id=rgbsmall1
	SetFontSize 45
	PlayAlertSound 2 300
	MinimapIcon 2 Grey Hexagon

Show # %D5 $type->socketslinks $tier->rgbsmall2
	Width 1
	Height <= 4
	Rarity Normal Magic Rare
	SocketGroup "RGB"
	#@ id=rgbsmall2
	SetFontSize 45
	MinimapIcon 2 Grey Hexagon`;

/** From the uniques section. Colours with no count at all. */
const ABYSS = `Show # $type->uniques $tier->4xabysshelmet
	Sockets >= AAAA
	Rarity Unique
	BaseType == "Bone Circlet"
	#@ id=4xabysshelmet
	SetFontSize 45
	PlayAlertSound 6 300
	MinimapIcon 0 Red Star

Show # $type->uniques $tier->3xabyss
	Sockets >= AAA
	Rarity Unique
	BaseType == "Carnal Armour"
	#@ id=3xabyss
	SetFontSize 45
	PlayAlertSound 6 300`;

/**
 * From "Endgame - Rare - Weapons". One block, all three counted forms: no count at all, an
 * explicit `>=3`, and `=0` for mods that must be absent.
 */
const RARE_WEAPON = `Show # %D5 $type->rareid $tier->weapon_phys
	Identified True
	DropLevel >= 50
	Rarity Rare
	Class == "Bows" "Claws" "Daggers" "One Hand Axes" "One Hand Maces" "One Hand Swords" "Thrusting One Hand Swords" "Two Hand Axes" "Two Hand Maces" "Two Hand Swords" "Wands" "Warstaves"
	HasExplicitMod "Merciless" "Tyrannical" "Cruel" "of the Underground" "Subterranean" "of Many" "of Tacati" "Tacati's"
	HasExplicitMod >=3 "Merciless" "Tyrannical" "Flaring" "Dictator's" "Emperor's" "of Celebration" "of Incision" "of Dissolution" "of Destruction" "of the Underground" "Subterranean" "of Many" "of Tacati" "Tacati's" "Veil"
	HasExplicitMod =0 "Heavy" "Serrated" "Wicked" "Vicious" "Glinting" "Burnished" "Polished" "Honed" "of Needling" "of Skill"
	#@ id=weapon-phys
	SetFontSize 45
	PlayAlertSound 3 300`;

const evaluate = (text: string, item: FilterItem) => evaluateFilter(parseFilter(text), item);

/** The `id` note of the last block that matched, which is how these fixtures name blocks. */
const idOf = (text: string, item: FilterItem): string | undefined =>
  evaluate(text, item).notes.id;

describe("parseFilter, on real NeverSink text", () => {
  it("reads the gold ladder as five blocks with their actions stripped out", () => {
    const blocks = parseFilter(GOLD);

    expect(blocks).toHaveLength(5);
    expect(blocks.every((block) => block.keyword === "Show")).toBe(true);
    // Only conditions survive. The busiest block here carries five actions and two
    // conditions, and none of the actions may be mistaken for one.
    expect(blocks[0]?.conditions.map((condition) => condition.name)).toEqual([
      "StackSize",
      "BaseType",
    ]);
    expect(blocks[3]?.conditions.map((condition) => condition.name)).toEqual([
      "StackSize",
      "BaseType",
      "AreaLevel",
    ]);
  });

  it("keeps the exact-match operator the sample writes on BaseType", () => {
    const [block] = parseFilter(GOLD);

    expect(block?.conditions[1]).toMatchObject({
      name: "BaseType",
      operator: "==",
      values: ["Gold"],
    });
  });

  it("reads the multi-value Rarity form the sample uses on its six-link blocks", () => {
    const blocks = parseFilter(SIX_LINK);
    const rarity = blocks[0]?.conditions.find((condition) => condition.name === "Rarity");

    expect(rarity?.operator).toBe("=");
    expect(rarity?.values).toEqual(["Normal", "Magic", "Rare"]);
  });

  it("reads a base-type list of forty-seven quoted names off one line", () => {
    const blocks = parseFilter(SIX_LINK);
    const baseType = blocks[0]?.conditions.find((condition) => condition.name === "BaseType");

    expect(baseType?.values).toHaveLength(47);
    // Quoted values keep their spaces, and an apostrophe is just a character.
    expect(baseType?.values).toContain("Assassin's Garb");
    expect(baseType?.values).toContain("Impact Force Propagator");
  });

  it("keeps the header comment out of the block it sits on", () => {
    const blocks = parseFilter(DECORATORS);

    expect(blocks).toHaveLength(6);
    expect(blocks.every((block) => block.keyword === "Show")).toBe(true);
  });

  it("ignores a block the sample has commented out entirely", () => {
    // Two `#Show` blocks sit in the middle of the decorators. Six blocks are live.
    const ids = parseFilter(DECORATORS).flatMap((block) =>
      block.notes.map((note) => note.value),
    );

    expect(ids).not.toContain("ilvl68");
    expect(ids).not.toContain("ilvl75");
    expect(ids).toEqual([
      "largerares",
      "mediumrares1",
      "tinyrares",
      "fourlinkedrares",
      "topilvl83",
      "topilvl84",
    ]);
  });

  it("marks every decorator block as continuing", () => {
    expect(parseFilter(DECORATORS).every((block) => block.continues)).toBe(true);
  });

  it("marks the hide layer as not continuing", () => {
    const blocks = parseFilter(HIDE_LAYER);

    expect(blocks.map((block) => block.keyword)).toEqual(["Hide", "Hide"]);
    expect(blocks.every((block) => block.continues)).toBe(false);
  });
});

describe("evaluateFilter, on real NeverSink text", () => {
  const gold = (StackSize: number, AreaLevel: number): FilterItem => ({
    BaseType: "Gold",
    Class: "Currency",
    StackSize,
    AreaLevel,
  });

  it("takes the first rung of the gold ladder a stack is big enough for", () => {
    expect(idOf(GOLD, gold(5000, 83))).toBe("gold-stack3");
    expect(idOf(GOLD, gold(3001, 83))).toBe("gold-stack3");
    expect(idOf(GOLD, gold(3000, 83))).toBe("gold-stack2");
    expect(idOf(GOLD, gold(200, 83))).toBe("gold-stack1");
    expect(idOf(GOLD, gold(10, 83))).toBe("gold-anyother");
  });

  it("lets AreaLevel switch a levelling rung off on a high-level character", () => {
    // The same 60-gold stack takes a different rung depending on where it dropped.
    expect(idOf(GOLD, gold(60, 60))).toBe("gold-stacklvl1");
    expect(idOf(GOLD, gold(60, 83))).toBe("gold-anyother");
  });

  it("does not offer the gold ladder anything that is not gold", () => {
    const result = evaluate(GOLD, { BaseType: "Chaos Orb", StackSize: 5000, AreaLevel: 83 });

    expect(result.verdict).toBe("none");
    expect(result.notes).toEqual({});
  });

  it("does not let == on BaseType match a longer name that contains it", () => {
    // `BaseType == "Gold"` must not catch a Gold Ring. Plain `=` would.
    const result = evaluate(GOLD, { BaseType: "Gold Ring", StackSize: 5000, AreaLevel: 83 });

    expect(result.verdict).toBe("none");
  });

  it("shows a clean six-link and drops a corrupted one to the lesser block", () => {
    const sixLink: FilterItem = {
      Mirrored: false,
      Corrupted: false,
      LinkedSockets: 6,
      ItemLevel: 80,
      Rarity: "Rare",
      BaseType: "Vaal Regalia",
    };

    expect(evaluate(SIX_LINK, sixLink).verdict).toBe("Show");
    expect(evaluate(SIX_LINK, sixLink).contributions).toEqual([]);

    // Corrupted fails the first block, but the second one asks for less.
    const corrupted = evaluate(SIX_LINK, { ...sixLink, Corrupted: true });
    expect(corrupted.verdict).toBe("Show");

    // A unique is outside `Rarity Normal Magic Rare`, so neither block wants it.
    const unique = evaluate(SIX_LINK, { ...sixLink, Rarity: "Unique" });
    expect(unique.verdict).toBe("none");
  });

  it("keeps a six-link off the top block when its base is not on the list", () => {
    const offList: FilterItem = {
      Mirrored: false,
      Corrupted: false,
      LinkedSockets: 6,
      ItemLevel: 80,
      Rarity: "Rare",
      BaseType: "Plate Vest",
    };

    // Still shown, but by the block that asks only for six links.
    expect(evaluate(SIX_LINK, offList).verdict).toBe("Show");
    expect(evaluate(SIX_LINK, { ...offList, LinkedSockets: 5 }).verdict).toBe("none");
  });

  it("hides an unidentified corrupted rare that gained no corrupted mod", () => {
    const junk: FilterItem = {
      Corrupted: true,
      Mirrored: false,
      Identified: false,
      CorruptedMods: 0,
      ItemLevel: 68,
      Rarity: "Rare",
      Class: "Body Armours",
    };

    expect(evaluate(HIDE_LAYER, junk).verdict).toBe("Hide");
    // One corrupted mod makes it worth looking at, so the hide layer lets it past.
    expect(evaluate(HIDE_LAYER, { ...junk, CorruptedMods: 1 }).verdict).toBe("none");
    // So does being identified already.
    expect(evaluate(HIDE_LAYER, { ...junk, Identified: true }).verdict).toBe("none");
  });

  it("collects every decorator a big rare weapon earns on the way down", () => {
    const weapon: FilterItem = {
      Width: 2,
      Height: 4,
      ItemLevel: 84,
      Rarity: "Rare",
      Class: "Two Hand Swords",
      LinkedSockets: 5,
    };

    const result = evaluate(DECORATORS, weapon);

    // Every block continues, so nothing stopped the walk.
    expect(result.verdict).toBe("none");
    expect(result.contributions.map((one) => one.value)).toEqual([
      "largerares",
      "fourlinkedrares",
      "topilvl83",
    ]);
    // The last one to speak wins the key.
    expect(result.notes).toEqual({ id: "topilvl83" });
  });

  it("gives a small rare only the decorators that fit it", () => {
    const ring: FilterItem = {
      Width: 1,
      Height: 1,
      ItemLevel: 84,
      Rarity: "Rare",
      Class: "Rings",
      LinkedSockets: 0,
    };

    const result = evaluate(DECORATORS, ring);

    // Width 1 and Height 1 is tinyrares, not largerares; no links, so no four-link border.
    expect(result.contributions.map((one) => one.value)).toEqual(["tinyrares", "topilvl84"]);
  });

  it("takes a linked RGB for the chromatic recipe whatever else is in the group", () => {
    const small: FilterItem = { Width: 2, Height: 2, Rarity: "Normal" };

    expect(idOf(CHROMATIC, { ...small, SocketGroup: "RGB" })).toBe("rgbsmall1");
    // A fourth socket in the same group does not spoil it.
    expect(idOf(CHROMATIC, { ...small, SocketGroup: "RGBB" })).toBe("rgbsmall1");
    // Split across two groups, nothing is linked R-G-B, so the recipe does not hold.
    expect(evaluate(CHROMATIC, { ...small, SocketGroup: "RG B" }).verdict).toBe("none");
    expect(evaluate(CHROMATIC, { ...small, SocketGroup: "RRG" }).verdict).toBe("none");
  });

  it("sizes the chromatic blocks by the item that carries the sockets", () => {
    const sockets = "RGB";

    expect(idOf(CHROMATIC, { Width: 2, Height: 2, Rarity: "Magic", SocketGroup: sockets })).toBe(
      "rgbsmall1",
    );
    expect(idOf(CHROMATIC, { Width: 1, Height: 4, Rarity: "Magic", SocketGroup: sockets })).toBe(
      "rgbsmall2",
    );
    // A unique is outside `Rarity Normal Magic Rare` on both blocks.
    expect(
      evaluate(CHROMATIC, { Width: 2, Height: 2, Rarity: "Unique", SocketGroup: sockets })
        .verdict,
    ).toBe("none");
  });

  it("counts abyss sockets with no socket count to go by", () => {
    const helmet: FilterItem = { Rarity: "Unique", BaseType: "Bone Circlet" };

    expect(idOf(ABYSS, { ...helmet, Sockets: "AAAA" })).toBe("4xabysshelmet");
    expect(evaluate(ABYSS, { ...helmet, Sockets: "AAA" }).verdict).toBe("none");
    // The three-abyss block wants a different base entirely.
    expect(
      idOf(ABYSS, { Rarity: "Unique", BaseType: "Carnal Armour", Sockets: "AAAR" }),
    ).toBe("3xabyss");
  });

  it("holds a rare weapon to all three counted forms at once", () => {
    const weapon: FilterItem = {
      Identified: true,
      DropLevel: 60,
      Rarity: "Rare",
      Class: "Two Hand Swords",
      HasExplicitMod: ["Merciless Blow", "Tyrannical Edge", "Flaring Blade"],
    };

    expect(idOf(RARE_WEAPON, weapon)).toBe("weapon-phys");

    // One mod short of the `>=3` line.
    expect(
      evaluate(RARE_WEAPON, {
        ...weapon,
        HasExplicitMod: ["Merciless Blow", "Tyrannical Edge"],
      }).verdict,
    ).toBe("none");

    // A "Heavy" prefix trips the `=0` line, which is there to keep hybrid rolls out.
    expect(
      evaluate(RARE_WEAPON, {
        ...weapon,
        HasExplicitMod: [...(weapon.HasExplicitMod ?? []), "Heavy Blade"],
      }).verdict,
    ).toBe("none");
  });

  it("names the block that set each decorator by its line", () => {
    const weapon: FilterItem = {
      Width: 2,
      Height: 4,
      ItemLevel: 84,
      Rarity: "Rare",
      Class: "Two Hand Swords",
      LinkedSockets: 5,
    };

    const blocks = parseFilter(DECORATORS);
    const result = evaluateFilter(blocks, weapon);

    // Each contribution points at a real block header, so a failing test can say which.
    for (const contribution of result.contributions) {
      const block = blocks.find((one) => one.line === contribution.line);
      expect(block).toBeDefined();
      expect(block?.keyword).toBe("Show");
    }
  });
});
