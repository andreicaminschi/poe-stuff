import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "@jest/globals";
import { parseItem, property } from "./parse-item.ts";

/**
 * The parser against the items in `data/sample-items`, which is what somebody actually
 * copied out of the game.
 *
 * Fixtures are read from that folder rather than pasted in here. A pasted copy loses the
 * carriage returns and the trailing spaces the game leaves behind, and those are exactly
 * the things a parser gets wrong.
 */

const SAMPLES = fileURLToPath(new URL("../../data/sample-items/", import.meta.url));

const sample = (name: string) => parseItem(readFileSync(`${SAMPLES}${name}`, "utf8"));

describe("every sample item", () => {
  const names = readdirSync(SAMPLES).filter((name) => name.endsWith(".txt"));

  it("finds some to read", () => {
    expect(names.length).toBeGreaterThan(30);
  });

  it.each(names)("reads %s with nothing left over", (name) => {
    const item = sample(name);

    expect(item.issues).toEqual([]);
    expect(item.itemClass).not.toBe("");
    expect(item.baseType).not.toBe("");
  });
});

describe("a rare with sockets and an influence", () => {
  const item = sample("influenced-rare.txt");

  it("reads the class, the rolled name and the base it was rolled on", () => {
    expect(item.itemClass).toBe("Shields");
    expect(item.rarity).toBe("Rare");
    expect(item.name).toBe("Woe Mark");
    expect(item.baseType).toBe("Cold-attuned Buckler");
  });

  it("marks the property a modifier raised", () => {
    expect(property(item, "Chance to Block")).toMatchObject({ value: "47%", augmented: true, numbers: [47] });
  });

  it("keeps requirements apart from properties", () => {
    expect(item.requirements.map((found) => found.name)).toEqual(["Level", "Str", "Dex"]);
    expect(item.properties.map((found) => found.name)).not.toContain("Str");
  });

  it("reads the linked group, trailing space and all", () => {
    expect(item.sockets).toEqual(["WWW"]);
  });

  it("reads the crafted modifier's header without a list of header words", () => {
    const crafted = item.mods.find((mod) => mod.header.name === "Upgraded");

    expect(crafted?.header).toMatchObject({
      affix: "prefix",
      qualifiers: ["Master", "Crafted"],
      tags: ["Gem"],
      tier: undefined,
    });
  });

  it("reads a suffix's tier and tags", () => {
    const suffix = item.mods.find((mod) => mod.header.name === "of Stoicism");

    expect(suffix?.header.tier).toBe(4);
    expect(suffix?.header.tags).toEqual(["Elemental", "Fire", "Cold", "Lightning", "Ailment"]);
  });

  it("puts reminder text under its modifier rather than treating it as one", () => {
    const implicit = item.mods[0];

    expect(implicit?.lines).toHaveLength(1);
    expect(implicit?.reminders).toEqual([
      "(Hits have +2% Critical Strike Chance against Brittle Enemies, for 4 seconds)",
    ]);
  });

  it("keeps the influence as a flag rather than reading meaning into it", () => {
    expect(item.flags).toEqual(["Shaper Item"]);
  });
});

describe("a unique", () => {
  const item = sample("unique.txt");

  it("splits the qualifier off a bracketed property name", () => {
    expect(property(item, "Quality")).toMatchObject({
      qualifier: "Attribute Modifiers",
      value: "+20%",
      numbers: [20],
    });
  });

  it("keeps a second clause on the header rather than folding it into the tags", () => {
    expect(item.mods[0]?.header).toMatchObject({ tags: ["Attribute"], extra: ["20% Increased"] });
  });

  it("calls a unique's modifier neither prefix nor suffix, and keeps the word", () => {
    const unique = item.mods[1];

    expect(unique?.header.affix).toBe("other");
    expect(unique?.header.qualifiers).toEqual(["Unique"]);
  });

  it("keeps the flavour text as prose and the foil line as a flag", () => {
    expect(item.extraSections).toContainEqual(["Rivers of power course through your veins."]);
    expect(item.flags).toEqual(["Foil Unique (Cobalt)"]);
  });
});

describe("a corrupted magic jewel", () => {
  const item = sample("jewel-corrupted.txt");

  it("reads the corruption implicit as an implicit that says it was corrupted", () => {
    expect(item.mods[0]?.header).toMatchObject({ affix: "implicit", qualifiers: ["Corruption"] });
  });

  it("sorts the range the game wrote backwards", () => {
    expect(item.mods[0]?.lines[0]?.rolls).toEqual([{ value: 22, min: 20, max: 25 }]);
  });

  it("keeps Corrupted as a flag", () => {
    expect(item.flags).toContain("Corrupted");
  });
});

describe("a resonator", () => {
  const item = sample("resonator.txt");

  it("has no rolled name, so the base type is the whole of it", () => {
    expect(item.name).toBe("");
    expect(item.baseType).toBe("Powerful Chaotic Resonator");
  });

  it("reads a stack that is over its own limit", () => {
    expect(property(item, "Stack Size")?.numbers).toEqual([46, 10]);
  });

  it("reads unlinked sockets as one group each", () => {
    expect(item.sockets).toEqual(["D", "D", "D"]);
  });
});

describe("a blighted map", () => {
  const item = sample("blighted-map.txt");

  it("keeps four lines under one header as one modifier", () => {
    expect(item.mods).toHaveLength(1);
    expect(item.mods[0]?.lines).toHaveLength(4);
  });

  it("marks the lines the passive tree will not scale", () => {
    expect(item.mods[0]?.lines.map((line) => line.unscalable)).toEqual([false, false, true, true]);
  });
});

describe("an item with an enchantment", () => {
  const item = sample("item-with-enchant.txt");

  it("reads the suffixed line as a modifier and keeps the suffix as its qualifier", () => {
    const enchant = item.mods.find((mod) => mod.header.qualifiers.includes("enchant"));

    expect(enchant?.lines[0]?.text).toBe("Allocates Discipline and Training");
  });
});

describe("a stack size with thousands commas", () => {
  it("reads the numbers without the commas", () => {
    expect(property(sample("currency-lifeforce.txt"), "Stack Size")?.numbers).toEqual([1499, 50000]);
  });
});

describe("text that is not an item", () => {
  it("says so rather than throwing", () => {
    expect(parseItem("").issues).toEqual([{ kind: "empty-item", line: "", section: 0 }]);
  });
});
