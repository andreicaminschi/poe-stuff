import { describe, it, expect } from "@jest/globals";
import { evaluateFilter } from "./evaluate-filter.ts";
import { formatCondition, formatNote } from "./format-note.ts";
import { parseFilter } from "./parse-filter.ts";
import type { ApplyKey, FilterItem } from "./filter-ast.ts";

/**
 * A bucket turned into a block, and the block asked about an item.
 *
 * A bucket's `conditions` array is nearly always empty — 4575 of 4580. The conditions are
 * not missing, they are implied: the `id` carries the base type or the name, the family
 * says how to read it, and `minStack` carries the rest. `unique:Heavy Belt` in the
 * `uniques-by-base` family means every unique on a Heavy Belt, and nothing else has to be
 * written down for that to be true.
 *
 * The decoding below lives in this test rather than in the package. The package reads and
 * writes filter text and knows nothing about buckets, which is how it stays standalone —
 * so this file is the written-down contract the generator has to satisfy, in the form of
 * blocks it should produce.
 *
 * Bucket bodies are quoted from `packages/filter/buckets-draft.json` as of 2026-08-20.
 */

/** The fields of a bucket that carry filter meaning. The rest is pricing and provenance. */
type Bucket = {
  readonly id: string;
  readonly family: string;
  readonly verb: string;
  readonly tier: string;
  readonly minStack: number;
  /** Names of the items in the bucket, as the classifier saw them priced. */
  readonly examples: readonly string[];
};

const note = (bucket: Bucket): string =>
  formatNote(
    {
      tier: bucket.tier as string,
      verb: bucket.verb as string,
      family: bucket.family as string,
    } as Partial<Record<ApplyKey, string>>,
    `bucket ${bucket.id}`,
  );

/** The part of the id after the family prefix, with any subcategory folder stripped. */
const nameOf = (id: string): string => {
  const afterPrefix = id.slice(id.indexOf(":") + 1);
  const afterFolder = afterPrefix.slice(afterPrefix.lastIndexOf("/") + 1);
  // `stack:currency/Mirror of Kalandra@1` — the @N repeats minStack.
  const at = afterFolder.lastIndexOf("@");
  return at === -1 ? afterFolder : afterFolder.slice(0, at);
};

/**
 * The conditions a bucket implies, by family. This is the mapping the generator has to
 * implement; every case below is checked against a real bucket further down.
 */
const conditionsFor = (bucket: Bucket): string[] => {
  const name = nameOf(bucket.id);

  switch (bucket.family) {
    case "uniques-by-base":
      // A unique's BaseType is the base it rolled on, so this is every unique on it.
      return ["Rarity Unique", `BaseType == "${name}"`];
    case "foulborn":
      return ["Foulborn True", "Rarity Unique", `BaseType == "${name}"`];
    case "unique-maps":
      // The one bucket with no name in its id at all: the whole class of them.
      return ["Rarity Unique", 'Class == "Maps"'];
    case "div-cards":
      return ['Class == "Divination Cards"', `BaseType == "${name}"`];
    case "gems":
      return gemConditions(name);
    case "stackables":
      return bucket.minStack > 0
        ? [`BaseType == "${name}"`, `StackSize >= ${bucket.minStack}`]
        : [`BaseType == "${name}"`];
    case "maps":
      return mapConditions(name);
    case "fragments":
    case "misc":
      return [`BaseType == "${name}"`];
    default:
      throw new Error(`no mapping for family ${bucket.family}`);
  }
};

/** `Ethereal Knives lvl21 q23 corrupted` — a gem name with optional level, quality, state. */
const gemConditions = (name: string): string[] => {
  const found = /^(.*?)(?: lvl(\d+))?(?: q(\d+))?( corrupted)?$/.exec(name);
  const gem = found?.[1] ?? name;
  const level = found?.[2];
  const quality = found?.[3];

  const conditions = [`BaseType == "${gem}"`];
  if (level !== undefined) conditions.push(`GemLevel >= ${level}`);
  if (quality !== undefined && quality !== "0") conditions.push(`Quality >= ${quality}`);
  conditions.push(found?.[4] === undefined ? "Corrupted False" : "Corrupted True");

  return conditions;
};

/** `tier16 frame0`, `t16 corrupted`, `nightmare`. Frames are 0 normal, 1 magic, 2 rare. */
const FRAMES: Record<string, string> = { "0": "Normal", "1": "Magic", "2": "Rare" };

const mapConditions = (name: string): string[] => {
  const tiered = /^tier(\d+) frame(\d+)$/.exec(name);
  if (tiered !== null) {
    return [`MapTier ${tiered[1]}`, `Rarity ${FRAMES[tiered[2] ?? "0"] ?? "Normal"}`];
  }

  const t16 = /^t16(.*)$/.exec(name);
  if (t16 !== null) {
    const rest = (t16[1] ?? "").trim();
    const conditions = ["MapTier >= 16"];
    if (rest.includes("corrupted")) conditions.push("Corrupted True");
    if (rest.includes("unidentified")) conditions.push("Identified False");
    if (rest.includes("originator")) conditions.push("HasImplicitMod True");
    return conditions;
  }

  return [`BaseType == "${name}"`];
};

/** A bucket as a filter block: its conditions, then its note. */
const blockFor = (bucket: Bucket, continues = false): string =>
  [
    bucket.tier === "hidden" ? "Hide" : "Show",
    ...conditionsFor(bucket).map((condition) => `\t${condition}`),
    ...(continues ? ["\tContinue"] : []),
    `\t${note(bucket)}`,
  ].join("\n");

const verdictOf = (bucket: Bucket, item: FilterItem) =>
  evaluateFilter(parseFilter(blockFor(bucket)), item);

// --- real buckets, quoted ---------------------------------------------------------------

const HEAVY_BELT: Bucket = {
  id: "unique:Heavy Belt",
  family: "uniques-by-base",
  verb: "check",
  tier: "T0",
  minStack: 0,
  examples: ["Mageblood 32988c", "Bisco's Leash 3c", "Dyadian Dawn 2c"],
};

const FOULBORN_BELT: Bucket = {
  id: "unique:foulborn/Heavy Belt",
  family: "foulborn",
  verb: "take",
  tier: "T1",
  minStack: 0,
  examples: [],
};

const MIRROR: Bucket = {
  id: "stack:currency/Mirror of Kalandra@1",
  family: "stackables",
  verb: "take",
  tier: "T0",
  minStack: 1,
  examples: ["Mirror of Kalandra 65kc"],
};

const AWAKENED_EMPOWER: Bucket = {
  id: "gem:Awakened Empower Support",
  family: "gems",
  verb: "take",
  tier: "T0",
  minStack: 0,
  examples: ["Awakened Empower Support 24641c"],
};

const ETHEREAL_KNIVES: Bucket = {
  id: "gem:Ethereal Knives lvl21 q23 corrupted",
  family: "gems",
  verb: "take",
  tier: "T0",
  minStack: 0,
  examples: ["Ethereal Knives 6955c"],
};

const APOTHECARY: Bucket = {
  id: "card:The Apothecary",
  family: "div-cards",
  verb: "take",
  tier: "T0",
  minStack: 0,
  examples: [],
};

const TIER16: Bucket = {
  id: "map:tier16 frame0",
  family: "maps",
  verb: "take",
  tier: "T3",
  minStack: 0,
  examples: [],
};

const T16_CORRUPTED: Bucket = {
  id: "map:t16 corrupted",
  family: "maps",
  verb: "check",
  tier: "T2",
  minStack: 0,
  examples: [],
};

const UNIQUE_MAP: Bucket = {
  id: "unique-map",
  family: "unique-maps",
  verb: "check",
  tier: "varies",
  minStack: 0,
  examples: [],
};

const RELIQUARY_KEY: Bucket = {
  id: "fragment:Cosmic Reliquary Key",
  family: "fragments",
  verb: "take",
  tier: "T0",
  minStack: 0,
  examples: [],
};

const SCRIPTURE: Bucket = {
  id: "misc:sanctum/The Original Scripture",
  family: "misc",
  verb: "take",
  tier: "T0",
  minStack: 0,
  examples: ["The Original Scripture 145066c"],
};

describe("a uniques-by-base bucket", () => {
  it("becomes a block that shows every unique on that base", () => {
    expect(blockFor(HEAVY_BELT)).toBe(
      [
        "Show",
        "\tRarity Unique",
        '\tBaseType == "Heavy Belt"',
        "\t#@ tier=T0 verb=check family=uniques-by-base bucket unique:Heavy Belt",
      ].join("\n"),
    );
  });

  it("takes any unique heavy belt, whichever unique it turned out to be", () => {
    // The three examples are three different uniques sharing one base: Mageblood at 33kc
    // and Dyadian Dawn at 2c. A filter cannot see which unique an item is, only its base,
    // which is why the bucket is by base and why its floor and ceiling are so far apart.
    expect(HEAVY_BELT.examples).toHaveLength(3);

    const result = verdictOf(HEAVY_BELT, { Rarity: "Unique", BaseType: "Heavy Belt" });

    expect(result.verdict).toBe("Show");
    expect(result.notes).toEqual({ tier: "T0", verb: "check", family: "uniques-by-base" });
  });

  it("leaves a rare heavy belt and a unique of another base alone", () => {
    expect(verdictOf(HEAVY_BELT, { Rarity: "Rare", BaseType: "Heavy Belt" }).verdict).toBe(
      "none",
    );
    expect(verdictOf(HEAVY_BELT, { Rarity: "Unique", BaseType: "Leather Belt" }).verdict).toBe(
      "none",
    );
  });

  it("does not let == catch a base whose name contains this one", () => {
    // There is a `unique:Leather Belt` bucket too. Plain `=` would have Heavy Belt matching
    // "Heavy Belt of Something" and the two buckets overlapping.
    expect(
      verdictOf(HEAVY_BELT, { Rarity: "Unique", BaseType: "Heavy Belt Fragment" }).verdict,
    ).toBe("none");
  });

  it("names its bucket in the freehand, since an id cannot be a note value", () => {
    const [block] = parseFilter(blockFor(HEAVY_BELT));

    expect(block?.freehand).toBe("bucket unique:Heavy Belt");
  });
});

describe("a foulborn bucket", () => {
  it("adds the Foulborn flag to the same base it shares with uniques-by-base", () => {
    expect(conditionsFor(FOULBORN_BELT)).toEqual([
      "Foulborn True",
      "Rarity Unique",
      'BaseType == "Heavy Belt"',
    ]);
  });

  it("separates a foulborn heavy belt from a plain one", () => {
    const base: FilterItem = { Rarity: "Unique", BaseType: "Heavy Belt" };

    expect(verdictOf(FOULBORN_BELT, { ...base, Foulborn: true }).verdict).toBe("Show");
    expect(verdictOf(FOULBORN_BELT, { ...base, Foulborn: false }).verdict).toBe("none");
    // The uniques-by-base block says nothing about Foulborn, so it takes both.
    expect(verdictOf(HEAVY_BELT, { ...base, Foulborn: true }).verdict).toBe("Show");
  });
});

describe("a stackables bucket", () => {
  it("reads the @N off the id, which is the same number as minStack", () => {
    expect(conditionsFor(MIRROR)).toEqual([
      'BaseType == "Mirror of Kalandra"',
      "StackSize >= 1",
    ]);
  });

  it("holds the stack to the size the bucket was priced at", () => {
    const item: FilterItem = { BaseType: "Chaos Orb", StackSize: 2 };
    const chaos: Bucket = { ...MIRROR, id: "stack:currency/Chaos Orb@3", minStack: 3 };

    expect(verdictOf(chaos, { ...item, StackSize: 3 }).verdict).toBe("Show");
    expect(verdictOf(chaos, item).verdict).toBe("none");
  });

  it("writes no StackSize at all when the bucket has no minStack", () => {
    const loose: Bucket = { ...MIRROR, id: "stack:currency/Albino Crab Claw", minStack: 0 };

    expect(conditionsFor(loose)).toEqual(['BaseType == "Albino Crab Claw"']);
  });
});

describe("a gems bucket", () => {
  it("takes a bare gem name as the whole condition", () => {
    expect(conditionsFor(AWAKENED_EMPOWER)).toEqual([
      'BaseType == "Awakened Empower Support"',
      "Corrupted False",
    ]);
  });

  it("splits level, quality and corruption off the end of the id", () => {
    expect(conditionsFor(ETHEREAL_KNIVES)).toEqual([
      'BaseType == "Ethereal Knives"',
      "GemLevel >= 21",
      "Quality >= 23",
      "Corrupted True",
    ]);
  });

  it("takes the 21/23 corrupted gem and not the 20/0 one", () => {
    const gem: FilterItem = {
      BaseType: "Ethereal Knives",
      GemLevel: 21,
      Quality: 23,
      Corrupted: true,
    };

    expect(verdictOf(ETHEREAL_KNIVES, gem).verdict).toBe("Show");
    expect(verdictOf(ETHEREAL_KNIVES, { ...gem, GemLevel: 20 }).verdict).toBe("none");
    expect(verdictOf(ETHEREAL_KNIVES, { ...gem, Quality: 20 }).verdict).toBe("none");
    expect(verdictOf(ETHEREAL_KNIVES, { ...gem, Corrupted: false }).verdict).toBe("none");
  });

  it("writes no Quality condition for a q0 bucket", () => {
    const q0: Bucket = { ...ETHEREAL_KNIVES, id: "gem:Purity of Fire lvl21 q0 corrupted" };

    expect(conditionsFor(q0)).toEqual([
      'BaseType == "Purity of Fire"',
      "GemLevel >= 21",
      "Corrupted True",
    ]);
  });
});

describe("a maps bucket", () => {
  it("turns tier and frame into MapTier and Rarity", () => {
    expect(conditionsFor(TIER16)).toEqual(["MapTier 16", "Rarity Normal"]);
    expect(conditionsFor({ ...TIER16, id: "map:tier15 frame2" })).toEqual([
      "MapTier 15",
      "Rarity Rare",
    ]);
    expect(conditionsFor({ ...TIER16, id: "map:tier9 frame1" })).toEqual([
      "MapTier 9",
      "Rarity Magic",
    ]);
  });

  it("matches a white tier 16 and not a rare one", () => {
    expect(verdictOf(TIER16, { MapTier: 16, Rarity: "Normal" }).verdict).toBe("Show");
    expect(verdictOf(TIER16, { MapTier: 16, Rarity: "Rare" }).verdict).toBe("none");
    expect(verdictOf(TIER16, { MapTier: 15, Rarity: "Normal" }).verdict).toBe("none");
  });

  it("rebuilds the conditions the five annotated buckets already carry", () => {
    // These are the only buckets with a `conditions` array, so the mapping can be checked
    // against what the classifier itself wrote.
    expect(conditionsFor(T16_CORRUPTED)).toEqual(["MapTier >= 16", "Corrupted True"]);
    expect(conditionsFor({ ...T16_CORRUPTED, id: "map:t16 corrupted unidentified" })).toEqual([
      "MapTier >= 16",
      "Corrupted True",
      "Identified False",
    ]);
    expect(conditionsFor({ ...T16_CORRUPTED, id: "map:t16 originator" })).toEqual([
      "MapTier >= 16",
      "HasImplicitMod True",
    ]);
  });
});

describe("the families whose id is only a name", () => {
  it("builds a block for a div card, a fragment and a misc item alike", () => {
    expect(conditionsFor(APOTHECARY)).toEqual([
      'Class == "Divination Cards"',
      'BaseType == "The Apothecary"',
    ]);
    expect(conditionsFor(RELIQUARY_KEY)).toEqual(['BaseType == "Cosmic Reliquary Key"']);
    // The subcategory folder is not part of the name.
    expect(conditionsFor(SCRIPTURE)).toEqual(['BaseType == "The Original Scripture"']);
  });

  it("matches the example the bucket was priced from", () => {
    expect(
      verdictOf(SCRIPTURE, { BaseType: "The Original Scripture" }).verdict,
    ).toBe("Show");
    expect(
      verdictOf(APOTHECARY, {
        Class: "Divination Cards",
        BaseType: "The Apothecary",
      }).verdict,
    ).toBe("Show");
  });

  it("makes the whole unique-map class one block, because the id has no name", () => {
    expect(conditionsFor(UNIQUE_MAP)).toEqual(["Rarity Unique", 'Class == "Maps"']);
    expect(
      verdictOf(UNIQUE_MAP, { Rarity: "Unique", Class: "Maps" }).verdict,
    ).toBe("Show");
  });
});

describe("extra conditions the generation phase adds", () => {
  it("narrows a bucket with a condition its id never implied", () => {
    // Heavy Belt uniques are worth looking at, but not off a levelling character. Nothing
    // in `unique:Heavy Belt` says that, so the generation phase adds a real condition line
    // and records where it came from in the comment.
    const generated = [
      "Show",
      "\tRarity Unique",
      '\tBaseType == "Heavy Belt"',
      `\t${formatCondition("AreaLevel >= 68", `generated by bucket ${HEAVY_BELT.id}`)}`,
      `\t${formatNote({ tier: "T0", verb: "check", family: "uniques-by-base" }, `bucket ${HEAVY_BELT.id}`)}`,
    ].join("\n");

    const blocks = parseFilter(generated);

    expect(blocks[0]?.conditions.map((one) => one.name)).toEqual([
      "Rarity",
      "BaseType",
      "AreaLevel",
    ]);
    // Provenance survives the parse, on the condition it belongs to.
    expect(blocks[0]?.conditions[2]?.comment).toBe(
      "generated by bucket unique:Heavy Belt",
    );

    const belt: FilterItem = { Rarity: "Unique", BaseType: "Heavy Belt" };

    expect(evaluateFilter(blocks, { ...belt, AreaLevel: 83 }).verdict).toBe("Show");
    expect(evaluateFilter(blocks, { ...belt, AreaLevel: 60 }).verdict).toBe("none");
  });

  it("takes as many extra conditions as the bucket needs, one per line", () => {
    const generated = [
      "Show",
      '\tBaseType == "Heavy Belt"',
      `\t${formatCondition("AreaLevel >= 68", "generated by bucket X")}`,
      `\t${formatCondition("Corrupted False", "generated by bucket X")}`,
      `\t${formatCondition('HasExplicitMod >=2 "of Haast" "of Tzteosh"', "bucket X")}`,
      `\t${formatNote({ tier: "T0", verb: "check" })}`,
    ].join("\n");

    const blocks = parseFilter(generated);

    expect(blocks[0]?.conditions.map((one) => one.name)).toEqual([
      "BaseType",
      "AreaLevel",
      "Corrupted",
      "HasExplicitMod",
    ]);

    const belt: FilterItem = {
      BaseType: "Heavy Belt",
      AreaLevel: 83,
      Corrupted: false,
      HasExplicitMod: ["of Haast", "of Tzteosh"],
    };

    // Every one of them has to hold.
    expect(evaluateFilter(blocks, belt).verdict).toBe("Show");
    expect(evaluateFilter(blocks, { ...belt, Corrupted: true }).verdict).toBe("none");
    expect(evaluateFilter(blocks, { ...belt, AreaLevel: 12 }).verdict).toBe("none");
    expect(
      evaluateFilter(blocks, { ...belt, HasExplicitMod: ["of Haast"] }).verdict,
    ).toBe("none");
  });

  it("keeps a quoted value intact next to a trailing comment", () => {
    // The `#` that starts the comment must not be found inside the quoted values.
    const generated = [
      "Show",
      `\t${formatCondition('BaseType == "Chaos Orb" "Divine Orb"', "bucket X")}`,
      `\t${formatNote({ tier: "T1", verb: "take" })}`,
    ].join("\n");

    const [block] = parseFilter(generated);

    expect(block?.conditions[0]?.values).toEqual(["Chaos Orb", "Divine Orb"]);
    expect(block?.conditions[0]?.comment).toBe("bucket X");
  });

  it("validates a generated condition the same as any other, so a bad one throws", () => {
    const bad = [
      "Show",
      '\tBaseType == "Gold"',
      "\tRariti Unique # generated by bucket X",
      "\t#@ tier=T0 verb=take",
    ];

    expect(() => parseFilter(bad.join("\n"))).toThrow(/line 3: unknown condition "Rariti"/);

    const worse = [
      "Show",
      '\tBaseType == "Gold"',
      "\tRarity Legendary # generated by bucket X",
      "\t#@ tier=T0 verb=take",
    ];

    expect(() => parseFilter(worse.join("\n"))).toThrow(
      /line 3: Rarity takes one of Normal, Magic, Rare, Unique/,
    );
  });

  it("refuses to write a condition carrying a # of its own", () => {
    // It would end the condition and start the comment, losing the rest of the line.
    expect(() => formatCondition('BaseType == "Rune #3"')).toThrow(
      /has a # in it, which would start the comment/,
    );
  });

  it("keeps the comment on the block header too", () => {
    const generated = [
      "Show # generated by bucket unique:Heavy Belt",
      '\tBaseType == "Heavy Belt"',
      `\t${formatNote({ tier: "T0", verb: "check" })}`,
    ].join("\n");

    expect(parseFilter(generated)[0]?.comment).toBe(
      "generated by bucket unique:Heavy Belt",
    );
  });
});

describe("the proto filter is a real filter", () => {
  it("has no line the game would skip but the validator would honour", () => {
    // Every condition is a live filter line. Strip the comments and the #@ notes, and what
    // is left is what the game runs — which is the point of not inventing a marker.
    const generated = [
      "Show",
      "\tRarity Unique",
      '\tBaseType == "Heavy Belt"',
      `\t${formatCondition("AreaLevel >= 68", "generated by bucket unique:Heavy Belt")}`,
      `\t${formatNote({ tier: "T0", verb: "check" }, "bucket unique:Heavy Belt")}`,
    ].join("\n");

    const stripped = generated
      .split("\n")
      .map((raw) => raw.split("#")[0]?.trimEnd() ?? "")
      .filter((raw) => raw.trim() !== "")
      .join("\n");

    expect(stripped).toBe(
      ["Show", "\tRarity Unique", '\tBaseType == "Heavy Belt"', "\tAreaLevel >= 68"].join(
        "\n",
      ),
    );

    // The stripped filter still narrows the same way — the comments carried no meaning.
    const belt: FilterItem = { Rarity: "Unique", BaseType: "Heavy Belt", AreaLevel: 60 };
    expect(evaluateFilter(parseFilter(generated), belt).verdict).toBe("none");
  });
});

describe("tier and verb, once a bucket is a block", () => {
  it("makes a hidden bucket a Hide block", () => {
    const hidden: Bucket = { ...SCRIPTURE, tier: "hidden" };
    const result = verdictOf(hidden, { BaseType: "The Original Scripture" });

    expect(result.verdict).toBe("Hide");
    expect(result.notes.tier).toBe("hidden");
  });

  it("puts a check bucket and a take bucket in the same filter without collision", () => {
    // Heavy Belt is `check` and Mirror is `take`. One item reaches exactly one of them.
    const filter = [blockFor(HEAVY_BELT), blockFor(MIRROR)].join("\n\n");
    const blocks = parseFilter(filter);

    expect(
      evaluateFilter(blocks, { Rarity: "Unique", BaseType: "Heavy Belt" }).notes.verb,
    ).toBe("check");
    expect(
      evaluateFilter(blocks, { BaseType: "Mirror of Kalandra", StackSize: 1 }).notes.verb,
    ).toBe("take");
  });

  it("lets a Continue block layer a family note under a tier block", () => {
    const filter = [blockFor(HEAVY_BELT, true), blockFor(FOULBORN_BELT)].join("\n\n");

    const foulborn: FilterItem = {
      Rarity: "Unique",
      BaseType: "Heavy Belt",
      Foulborn: true,
    };

    const result = evaluateFilter(parseFilter(filter), foulborn);

    // Both buckets claim this item; the more specific one is written second and wins.
    expect(result.matched).toHaveLength(2);
    expect(result.notes).toEqual({ tier: "T1", verb: "take", family: "foulborn" });
  });
});
