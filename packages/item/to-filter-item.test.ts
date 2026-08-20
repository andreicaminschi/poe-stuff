import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "@jest/globals";
import { parseItem } from "./parse-item.ts";
import { toFilterItem } from "./to-filter-item.ts";

/**
 * The adapter onto the shape `@poe/filter-eval` evaluates.
 *
 * What is being checked here is mostly the defaults. The evaluator reads a missing key as a
 * real gap and fails the condition, so an item that never had quality has to say `0` rather
 * than say nothing — and an item that cannot answer a condition at all has to keep saying
 * nothing rather than guess.
 */

const SAMPLES = fileURLToPath(new URL("../../data/sample-items/", import.meta.url));

const filterItem = (name: string) => toFilterItem(parseItem(readFileSync(`${SAMPLES}${name}`, "utf8")));

describe("a rare shield with three linked white sockets", () => {
  const item = filterItem("influenced-rare.txt");

  it("names the class and the base rather than the rolled name", () => {
    expect(item.Class).toBe("Shields");
    expect(item.BaseType).toBe("Cold-attuned Buckler");
  });

  it("writes the sockets the way both socket conditions read them", () => {
    expect(item.Sockets).toBe("WWW");
    expect(item.SocketGroup).toBe("WWW");
    expect(item.LinkedSockets).toBe(3);
  });

  it("turns the influence flag into the enum the filter compares", () => {
    expect(item.HasInfluence).toEqual(["Shaper"]);
    expect(item.ShaperItem).toBe(true);
    expect(item.ElderItem).toBe(false);
  });

  it("gives HasExplicitMod the affix names, which is what the condition matches", () => {
    expect(item.HasExplicitMod).toEqual([
      "Unwavering",
      "Vigorous",
      "Upgraded",
      "of the Magma",
      "of Stoicism",
      "of Shaping",
    ]);
  });

  it("fills the defaults rather than leaving the keys off", () => {
    expect(item.Quality).toBe(0);
    expect(item.Corrupted).toBe(false);
    expect(item.StackSize).toBe(1);
    expect(item.Identified).toBe(true);
  });

  it("leaves absent what no item text can answer", () => {
    expect(item.AreaLevel).toBeUndefined();
    expect(item.Width).toBeUndefined();
    expect(item.DropLevel).toBeUndefined();
    expect(item.BaseArmour).toBeUndefined();
  });
});

describe("unlinked sockets", () => {
  it("are sockets but not links", () => {
    const item = filterItem("resonator.txt");

    expect(item.Sockets).toBe("D D D");
    expect(item.LinkedSockets).toBe(0);
  });
});

describe("a corrupted magic jewel", () => {
  const item = filterItem("jewel-corrupted.txt");

  it("is corrupted, and counts the implicit the corruption added", () => {
    expect(item.Corrupted).toBe(true);
    expect(item.CorruptedMods).toBe(1);
  });

  it("has an implicit", () => {
    expect(item.HasImplicitMod).toBe(true);
  });
});

describe("a unique", () => {
  const item = filterItem("unique.txt");

  it("reads the quality off the bracketed property", () => {
    expect(item.Quality).toBe(20);
  });

  it("has no explicit affix names, because a unique's modifiers carry none", () => {
    expect(item.HasExplicitMod).toEqual([]);
  });
});

describe("an enchanted item", () => {
  it("has an enchantment, and its text", () => {
    const item = filterItem("item-with-enchant.txt");

    expect(item.AnyEnchantment).toBe(true);
    expect(item.HasEnchantment).toEqual(["Allocates Discipline and Training"]);
  });
});

describe("a blighted map", () => {
  it("takes the tier out of the name, where the game folded it", () => {
    const item = filterItem("blighted-map.txt");

    expect(item.MapTier).toBe(16);
    expect(item.BlightedMap).toBe(true);
    expect(item.UberBlightedMap).toBe(false);
  });

  it("tells the uber form apart from the ordinary one", () => {
    const item = filterItem("blight-ravaged-map.txt");

    expect(item.UberBlightedMap).toBe(true);
    expect(item.BlightedMap).toBe(false);
  });
});

describe("rarities the filter language does not have", () => {
  it("calls a currency item Normal, the way the game does", () => {
    expect(filterItem("currency-ichor.txt").Rarity).toBe("Normal");
  });

  it("calls a divination card Normal too", () => {
    expect(filterItem("divination-card.txt").Rarity).toBe("Normal");
  });

  it("reads a stack size as the count, not the limit", () => {
    expect(filterItem("currency-lifeforce.txt").StackSize).toBe(1499);
  });
});
