import { describe, it, expect } from "@jest/globals";
import { evaluateFilter } from "./evaluate-filter.ts";
import { parseFilter } from "./parse-filter.ts";
import { APPLY_KEYS } from "./filter-ast.ts";
import type { FilterItem } from "./filter-ast.ts";

/**
 * What a generated filter reports back.
 *
 * This is the package doing its actual job: a bucket is turned into filter blocks by
 * something else, and these tests ask whether the blocks that came out say what the bucket
 * meant. Every fixture is written the way a generator would write it — conditions, then
 * `Continue` if the block continues, then the `#@` line as the block's last word — and
 * every test feeds it one item and checks the notes that fall out.
 *
 * The other test files check the grammar. This one checks the loop.
 */

/** Verdict, merged notes, every note in order, and the blocks that produced them. */
const run = (text: string, item: FilterItem) => {
  const result = evaluateFilter(parseFilter(text), item);

  return {
    verdict: result.verdict,
    notes: result.notes,
    // `line:key=value`, where the line is the block header that carried the note, so a
    // failure names the block rather than just the value that came out wrong.
    emitted: result.contributions.map((one) => `${one.line}:${one.key}=${one.value}`),
    matched: result.matched,
  };
};

/** The item every gold block below is written for. */
const GOLD_STACK: FilterItem = { StackSize: 200, BaseType: "Gold" };

describe("a generated filter, on one item", () => {
  it("spits out both notes when the first block continues into the second", () => {
    const generated = `Show # %H5 $type->gold $tier->stack1
	StackSize >= 150
	BaseType == "Gold"
	Continue
	#@ tier=T3 verb=take

Show # %H5 $type->gold $tier->stack1
	StackSize >= 150
	BaseType == "Gold"
	#@ tier=T0 verb=take`;

    const { verdict, notes, emitted } = run(generated, GOLD_STACK);

    // Both blocks matched, so both blocks spoke.
    expect(emitted).toEqual(["1:tier=T3", "1:verb=take", "7:tier=T0", "7:verb=take"]);
    // The later block wins the key it shares, the same way a later colour would.
    expect(notes).toEqual({ tier: "T0", verb: "take" });
    // The block that stopped the walk is the one without a Continue.
    expect(verdict).toBe("Show");
  });

  it("stops at the first block when the generator forgot the Continue", () => {
    // The same two blocks, minus one line. This is the mistake worth catching: the second
    // block is unreachable and its tier never reaches the item.
    const generated = `Show
	StackSize >= 150
	BaseType == "Gold"
	#@ tier=T3 verb=take

Show
	StackSize >= 150
	BaseType == "Gold"
	#@ tier=T0 verb=take`;

    const { notes, emitted } = run(generated, GOLD_STACK);

    expect(emitted).toEqual(["1:tier=T3", "1:verb=take"]);
    expect(notes).toEqual({ tier: "T3", verb: "take" });
  });

  it("takes Continue however the generator cases and indents it", () => {
    const generated = `Show
	StackSize >= 150
	BaseType == "Gold"
    continue
	#@ tier=T3 verb=take

Show
	StackSize >= 150
	BaseType == "Gold"
	#@ tier=T0 verb=check`;

    expect(run(generated, GOLD_STACK).emitted).toEqual([
      "1:tier=T3",
      "1:verb=take",
      "7:tier=T0",
      "7:verb=check",
    ]);
  });

  it("lets block order decide which of two tiers an item ends up on", () => {
    const lowFirst = `Show
	StackSize >= 150
	Continue
	#@ tier=T3 verb=take

Show
	StackSize >= 150
	#@ tier=T0 verb=take`;

    const highFirst = `Show
	StackSize >= 150
	Continue
	#@ tier=T0 verb=take

Show
	StackSize >= 150
	#@ tier=T3 verb=take`;

    expect(run(lowFirst, GOLD_STACK).notes.tier).toBe("T0");
    expect(run(highFirst, GOLD_STACK).notes.tier).toBe("T3");
  });

  it("says nothing for a block whose conditions the item misses", () => {
    // A generator that wrote the threshold too high emits a block nothing reaches.
    const generated = `Show
	StackSize >= 3001
	BaseType == "Gold"
	Continue
	#@ tier=T0 verb=take

Show
	StackSize >= 150
	BaseType == "Gold"
	#@ tier=T3 verb=take`;

    const { notes, emitted, matched } = run(generated, GOLD_STACK);

    expect(emitted).toEqual(["7:tier=T3", "7:verb=take"]);
    expect(notes).toEqual({ tier: "T3", verb: "take" });
    expect(matched.map((one) => one.line)).toEqual([7]);
  });

  it("gathers the optional family from one block and the tier from a later one", () => {
    const generated = `Show
	BaseType == "Gold"
	Continue
	#@ tier=T5 verb=check family=stackables

Show
	StackSize >= 150
	#@ tier=T3 verb=take`;

    const { notes, emitted } = run(generated, GOLD_STACK);

    expect(emitted).toEqual([
      "1:tier=T5",
      "1:verb=check",
      "1:family=stackables",
      "6:tier=T3",
      "6:verb=take",
    ]);
    // family survives because the second block says nothing about it.
    expect(notes).toEqual({ tier: "T3", verb: "take", family: "stackables" });
  });

  it("reports a note on a Hide block, and reports the Hide", () => {
    const generated = `Hide
	StackSize < 150
	BaseType == "Gold"
	#@ tier=hidden verb=check`;

    const { verdict, notes } = run(generated, { StackSize: 10, BaseType: "Gold" });

    expect(verdict).toBe("Hide");
    expect(notes).toEqual({ tier: "hidden", verb: "check" });
  });

  it("answers with nothing at all when no block wanted the item", () => {
    const generated = `Show
	StackSize >= 150
	BaseType == "Gold"
	#@ tier=T3 verb=take`;

    const { verdict, notes, emitted, matched } = run(generated, {
      StackSize: 1,
      BaseType: "Chaos Orb",
    });

    expect(verdict).toBe("none");
    expect(notes).toEqual({});
    expect(emitted).toEqual([]);
    expect(matched).toEqual([]);
  });

  it("carries the freehand tail through for whoever is reading the failure", () => {
    const generated = `Show
	BaseType == "Gold"
	#@ tier=T3 verb=take bucket gold-stack1, floor 150, from the exchange`;

    const { matched, notes } = run(generated, GOLD_STACK);

    expect(matched).toEqual([
      {
        line: 1,
        keyword: "Show",
        freehand: "bucket gold-stack1, floor 150, from the exchange",
      },
    ]);
    // The freehand is decoration. It never becomes a note.
    expect(notes).toEqual({ tier: "T3", verb: "take" });
  });
});

describe("a generated filter, on the values a bucket can carry", () => {
  // If a bucket can hold the value, the generator must be able to write it. These fail the
  // day APPLY_KEYS and the bucket vocabulary drift apart.

  it("accepts every tier a bucket may be on", () => {
    for (const tier of APPLY_KEYS.tier) {
      const generated = `Show\n\tBaseType == "Gold"\n\t#@ tier=${tier} verb=take`;

      expect(run(generated, GOLD_STACK).notes).toEqual({ tier, verb: "take" });
    }
  });

  it("accepts every verb a bucket may carry", () => {
    for (const verb of APPLY_KEYS.verb) {
      const generated = `Show\n\tBaseType == "Gold"\n\t#@ tier=T1 verb=${verb}`;

      expect(run(generated, GOLD_STACK).notes).toEqual({ tier: "T1", verb });
    }
  });

  it("accepts every family a bucket may belong to", () => {
    for (const family of APPLY_KEYS.family) {
      const generated = `Show\n\tBaseType == "Gold"\n\t#@ tier=T1 verb=take family=${family}`;

      expect(run(generated, GOLD_STACK).notes).toEqual({ tier: "T1", verb: "take", family });
    }
  });

  it("refuses a tier that is not one of the eight", () => {
    const generated = `Show
	BaseType == "Gold"
	#@ tier=T9 verb=take`;

    expect(() => parseFilter(generated)).toThrow(/line 3: tier takes one of .*got "T9"/);
  });

  it("refuses a verb written in the wrong case", () => {
    // Note values are the one part of the format that is case-sensitive, because a script
    // writes them and a script has no excuse.
    const generated = `Show
	BaseType == "Gold"
	#@ tier=T1 verb=Take`;

    expect(() => parseFilter(generated)).toThrow(
      /line 3: verb takes one of take, check, gamble/,
    );
  });

  it("refuses a key nobody declared", () => {
    const generated = `Show
	BaseType == "Gold"
	#@ tier=T1 verb=take colour=red`;

    expect(() => parseFilter(generated)).toThrow(/line 3: unknown note key "colour"/);
  });

  it("refuses a block that never says what tier it is", () => {
    const generated = `Show
	BaseType == "Gold"
	#@ verb=take`;

    expect(() => parseFilter(generated)).toThrow(
      /line 3: a #@ note needs tier and verb, and this one has no tier/,
    );
  });

  it("refuses a block with no note at all, even one the generator left bare", () => {
    const generated = `Show
	BaseType == "Gold"
	SetFontSize 45`;

    expect(() => parseFilter(generated)).toThrow(
      /the block on line 1 has no #@ note, and every block needs one/,
    );
  });

  it("refuses anything written after the note", () => {
    // The note is the block's last word. An action below it is a line the note does not
    // describe, and a generator emitting one has its template out of order.
    const generated = `Show
	BaseType == "Gold"
	#@ tier=T1 verb=take
	SetFontSize 45`;

    expect(() => parseFilter(generated)).toThrow(
      /line 4: the action SetFontSize after the #@ note/,
    );
  });

  it("reads the shorthand a person would reach for as freehand, and still demands the pairs", () => {
    // `#@ T3 take` has no `=` in it, so it is all freehand and the note says nothing.
    const generated = `Show
	BaseType == "Gold"
	#@ T3 take`;

    expect(() => parseFilter(generated)).toThrow(
      /line 3: a #@ note needs tier and verb, and this one has no tier/,
    );
  });

  it("ignores the decoration around the note", () => {
    // Actions and header comments are noise to a validator. The notes come out the same.
    const bare = `Show
	BaseType == "Gold"
	#@ tier=T3 verb=take`;

    const decorated = `Show # %H5 $type->gold $tier->stack1
	BaseType == "Gold"
	SetFontSize 45
	SetTextColor 235 200 110 255
	PlayAlertSound 2 300
	MinimapIcon 1 Yellow Cross
	#@ tier=T3 verb=take`;

    expect(run(decorated, GOLD_STACK).notes).toEqual(run(bare, GOLD_STACK).notes);
  });
});
