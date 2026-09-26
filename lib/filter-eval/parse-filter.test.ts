import { describe, it, expect } from "@jest/globals";
import { parseFilter } from "./parse-filter.ts";

const NOTE = "#@ tier=T1 verb=take";
const block = (...lines: string[]): string => ["Show", ...lines, NOTE].join("\n");
const only = (text: string) => {
  const blocks = parseFilter(text);
  expect(blocks).toHaveLength(1);
  return blocks[0]!;
};
const condition = (line: string) => only(block(line)).conditions[0]!;

describe("parseFilter", () => {
  describe("blocks", () => {
    it("returns no blocks for empty text", () => {
      expect(parseFilter("")).toEqual([]);
    });

    it("reads one block with its keyword, header comment, line and notes", () => {
      const result = parseFilter("\nShow # header note\nBaseType \"Ring\"\n#@ tier=T1 verb=take");

      expect(result).toEqual([
        {
          keyword: "Show",
          conditions: [
            { name: "BaseType", kind: "strings", operator: "=", values: ["Ring"], comment: "", line: 3 },
          ],
          notes: [
            { key: "tier", value: "T1", line: 4 },
            { key: "verb", value: "take", line: 4 },
          ],
          freehand: "",
          comment: "header note",
          continues: false,
          line: 2,
        },
      ]);
    });

    it("reads keywords and condition names in any letter case", () => {
      const result = only("hIDE\nbasetype \"Ring\"\n#@ tier=T1 verb=take");

      expect(result.keyword).toBe("Hide");
      expect(result.conditions[0]!.name).toBe("BaseType");
    });

    it("reads Minimal as a block keyword", () => {
      expect(only("Minimal\n" + NOTE).keyword).toBe("Minimal");
    });

    it("splits consecutive blocks and keeps their order", () => {
      const result = parseFilter(`Show\n${NOTE}\nHide\n${NOTE}`);

      expect(result.map((b) => [b.keyword, b.line])).toEqual([
        ["Show", 1],
        ["Hide", 3],
      ]);
    });

    it("accepts Windows line endings", () => {
      expect(parseFilter(`Show\r\n${NOTE}\r\n`)).toHaveLength(1);
    });

    it("marks a block that carries a Continue line", () => {
      expect(only(`Show\nContinue\n${NOTE}`).continues).toBe(true);
    });

    it("skips action lines without recording them", () => {
      expect(only(block("SetFontSize 45", "PlayEffect Red")).conditions).toEqual([]);
    });

    it("ignores comment lines that are not notes", () => {
      expect(only(`# top\nShow\n#@tier=T1\n${NOTE}`).notes).toHaveLength(2);
    });

    it("refuses anything after a keyword on the header line", () => {
      expect(() => parseFilter(`Show BaseType "x"\n${NOTE}`)).toThrow('line 1: Show takes nothing after it, got "BaseType \\"x\\""');
    });

    it("refuses a condition before any block", () => {
      expect(() => parseFilter('BaseType "x"')).toThrow("line 1: the condition BaseType before any Show, Hide or Minimal block");
    });

    it("refuses an action before any block", () => {
      expect(() => parseFilter("SetFontSize 45")).toThrow("line 1: the action SetFontSize before any Show, Hide or Minimal block");
    });

    it("refuses Continue before any block", () => {
      expect(() => parseFilter("Continue")).toThrow("line 1: Continue before any Show, Hide or Minimal block");
    });

    it("refuses a condition that comes after the note", () => {
      expect(() => parseFilter(`Show\n${NOTE}\nQuality > 5`)).toThrow("line 3: the condition Quality after the #@ note");
    });

    it("refuses Continue that comes after the note", () => {
      expect(() => parseFilter(`Show\n${NOTE}\nContinue`)).toThrow("line 3: Continue after the #@ note");
    });

    it("refuses a second note in the same block", () => {
      expect(() => parseFilter(`Show\n${NOTE}\n${NOTE}`)).toThrow("line 3: a #@ note after the #@ note");
    });

    it("refuses a block without a note, naming the line of the next header", () => {
      expect(() => parseFilter(`Show\nHide\n${NOTE}`)).toThrow("line 2: the block on line 1 has no #@ note");
    });

    it("names the final line number when the last block has no note", () => {
      // counts the empty trailing line
      expect(() => parseFilter("Show\n")).toThrow("line 2: the block on line 1 has no #@ note");
    });

    it("refuses Import lines", () => {
      expect(() => parseFilter('Import "x.filter"')).toThrow("line 1: Import is not supported");
    });

    it("refuses an unknown condition name", () => {
      expect(() => parseFilter("Show\nBaseTyp \"x\"")).toThrow('line 2: unknown condition "BaseTyp"');
    });
  });

  describe("notes", () => {
    it("keeps the freehand text after the pairs verbatim", () => {
      const result = only("Show\n#@ tier=T2 verb=check  some  debug = text");

      expect(result.freehand).toBe("some  debug = text");
    });

    it("reads every known key in order", () => {
      const result = only("Show\n#@ tier=T1 upto=T0 verb=gamble family=gems");

      expect(result.notes.map((n) => `${n.key}=${n.value}`)).toEqual(["tier=T1", "upto=T0", "verb=gamble", "family=gems"]);
    });

    it("refuses a key that appears twice", () => {
      expect(() => parseFilter("Show\n#@ tier=T1 verb=take tier=T2")).toThrow('line 2: note key "tier" appears twice');
    });

    it("reads a quoted value when it holds no spaces", () => {
      expect(only('Show\n#@ tier="T1" verb=take').notes[0]!.value).toBe("T1");
    });

    it("refuses a bare note marker", () => {
      expect(() => parseFilter("Show\n#@")).toThrow("line 2: a #@ note needs tier and verb, and this one has no tier");
    });

    it("refuses a note without a verb", () => {
      expect(() => parseFilter("Show\n#@ tier=T1")).toThrow("line 2: a #@ note needs tier and verb, and this one has no verb");
    });

    it("refuses an unknown key", () => {
      expect(() => parseFilter("Show\n#@ tier=T1 verb=take colour=red")).toThrow('line 2: unknown note key "colour"');
    });

    it("refuses a key with capital letters", () => {
      expect(() => parseFilter("Show\n#@ Tier=T1 verb=take")).toThrow('line 2: bad note pair "Tier=T1"');
    });

    it("refuses a key with an empty value", () => {
      expect(() => parseFilter("Show\n#@ tier= verb=take")).toThrow('line 2: bad note pair "tier="');
    });

    it("refuses a value outside the key's list", () => {
      expect(() => parseFilter("Show\n#@ tier=T1 verb=Take")).toThrow("line 2: verb takes one of take, check, gamble, got \"Take\"");
    });

    it("refuses an unterminated quoted value", () => {
      expect(() => parseFilter('Show\n#@ tier="T1 verb=take')).toThrow("line 2: unterminated quote in note");
    });

    it("treats a note trailing a condition as an ordinary comment", () => {
      const result = only(block("Quality > 5 #@ tier=T3 verb=check"));

      expect(result.conditions[0]!.comment).toBe("@ tier=T3 verb=check");
      expect(result.notes.map((n) => n.value)).toEqual(["T1", "take"]);
    });
  });

  describe("comments and quoting", () => {
    it("keeps a hash inside quotes as part of the value", () => {
      expect(condition('BaseType "A#B" # why').values).toEqual(["A#B"]);
    });

    it("keeps the trailing comment on the condition, trimmed and without the hash", () => {
      expect(condition("Quality > 5   #  from bucket x  ").comment).toBe("from bucket x");
    });

    it("keeps quoted values with spaces as one value", () => {
      expect(condition('BaseType == "Two Stone Ring" Coral').values).toEqual(["Two Stone Ring", "Coral"]);
    });

    it("reads an empty quoted value as an empty string", () => {
      // "" substring-matches every base type
      expect(condition('BaseType ""').values).toEqual([""]);
    });

    it("refuses an unterminated quote", () => {
      expect(() => parseFilter(block('BaseType "Ring'))).toThrow("line 2: unterminated quote");
    });
  });

  describe("operators", () => {
    it("defaults to = when the line writes no operator", () => {
      expect(condition("Quality 5").operator).toBe("=");
    });

    it("needs at least one value after the operator", () => {
      expect(() => parseFilter(block("Quality >="))).toThrow("line 2: Quality needs at least one value");
    });

    it("reads a glued operator as a value, not an operator", () => {
      expect(() => parseFilter(block("Quality >=5"))).toThrow('line 2: Quality takes a number, got ">=5"');
    });
  });

  describe("boolean conditions", () => {
    it("accepts True or False in any case", () => {
      expect(condition("Corrupted true").values).toEqual(["true"]);
    });

    it("accepts a negating operator", () => {
      expect(condition("Corrupted != False").operator).toBe("!=");
    });

    it("refuses a comparison operator", () => {
      expect(() => parseFilter(block("Corrupted > True"))).toThrow('line 2: Corrupted does not take the operator ">"');
    });

    it("refuses a value that is not True or False", () => {
      expect(() => parseFilter(block("Corrupted Yes"))).toThrow('line 2: Corrupted takes True or False, got "Yes"');
    });

    it("refuses two values", () => {
      expect(() => parseFilter(block("Corrupted True False"))).toThrow("line 2: Corrupted takes exactly one value, got 2");
    });
  });

  describe("numeric conditions", () => {
    it("accepts every comparison operator", () => {
      expect(condition("ItemLevel <= 84")).toMatchObject({ operator: "<=", values: ["84"] });
    });

    it("refuses hex and exponent numbers", () => {
      expect(() => parseFilter(block("Quality 0x10"))).toThrow("takes a number");
      expect(() => parseFilter(block("Quality 1e3"))).toThrow("takes a number");
    });

    it("refuses a value that is not a number", () => {
      expect(() => parseFilter(block("Quality high"))).toThrow('line 2: Quality takes a number, got "high"');
    });

    it("refuses a quoted blank value", () => {
      expect(() => parseFilter(block('Quality " "'))).toThrow('line 2: Quality takes a number, got " "');
    });

    it("refuses infinity", () => {
      expect(() => parseFilter(block("Quality Infinity"))).toThrow("takes a number");
    });
  });

  describe("rarity", () => {
    it("accepts several rarities under equality as an any-of list", () => {
      expect(condition("Rarity Normal Magic Rare").values).toEqual(["Normal", "Magic", "Rare"]);
    });

    it("accepts one rarity under a comparison", () => {
      expect(condition("Rarity >= rare")).toMatchObject({ kind: "ordered", operator: ">=", values: ["rare"] });
    });

    it("refuses several rarities under a comparison", () => {
      expect(() => parseFilter(block("Rarity > Normal Magic"))).toThrow("line 2: Rarity takes exactly one value, got 2");
    });

    it("refuses a rarity that is not on the ladder", () => {
      expect(() => parseFilter(block("Rarity Relic"))).toThrow('line 2: Rarity takes one of Normal, Magic, Rare, Unique, got "Relic"');
    });
  });

  describe("enum conditions", () => {
    it("accepts listed values in any case", () => {
      expect(condition("HasInfluence shaper None").values).toEqual(["shaper", "None"]);
    });

    it("refuses a value outside the list", () => {
      expect(() => parseFilter(block("HasInfluence Eater"))).toThrow('HasInfluence takes one of Shaper, Elder, Crusader, Hunter, Redeemer, Warlord, None, got "Eater"');
    });

    it("refuses a comparison operator", () => {
      expect(() => parseFilter(block("HasInfluence >= Shaper"))).toThrow('HasInfluence does not take the operator ">="');
    });
  });

  describe("string conditions", () => {
    it("refuses a comparison operator", () => {
      expect(() => parseFilter(block('Class > "Rings"'))).toThrow('Class does not take the operator ">"');
    });

    it("accepts any value, with no whitelist", () => {
      expect(condition("Class NotARealClass").values).toEqual(["NotARealClass"]);
    });
  });

  describe("socket conditions", () => {
    it("reads a count and colours together", () => {
      expect(condition("SocketGroup >= 5GGG").sockets).toEqual({ count: 5, colours: { G: 3 } });
    });

    it("reads colours alone with no count", () => {
      expect(condition("Sockets AAAA").sockets).toEqual({ colours: { A: 4 } });
    });

    it("reads a count alone with no colours", () => {
      expect(condition("Sockets >= 6").sockets).toEqual({ count: 6, colours: {} });
    });

    it("reads lowercase colour letters", () => {
      expect(condition("SocketGroup rgbw").sockets).toEqual({ colours: { R: 1, G: 1, B: 1, W: 1 } });
    });

    it("refuses a letter that is not a socket colour", () => {
      expect(() => parseFilter(block("Sockets RX"))).toThrow('Sockets does not know the socket colour "X"');
    });

    it("refuses colours written before the count", () => {
      expect(() => parseFilter(block("Sockets GG5"))).toThrow('Sockets takes a count and colours, got "GG5"');
    });

    it("refuses an empty quoted spec", () => {
      expect(() => parseFilter(block('Sockets ""'))).toThrow('Sockets takes a count and colours, got ""');
    });

    it("refuses two specs", () => {
      expect(() => parseFilter(block("Sockets 5 RGB"))).toThrow("Sockets takes exactly one value, got 2");
    });
  });

  describe("counted conditions", () => {
    it("reads a count glued to its operator", () => {
      expect(condition('HasExplicitMod >=2 "of Haast" Tyrannical')).toMatchObject({ operator: ">=", count: 2, values: ["of Haast", "Tyrannical"] });
    });

    it("reads a count spaced from its operator", () => {
      expect(condition('HasExplicitMod >= 2 "of Haast"')).toMatchObject({ operator: ">=", count: 2, values: ["of Haast"] });
    });

    it("reads a glued zero count as none of them", () => {
      expect(condition('HasEnchantment =0 "x"')).toMatchObject({ operator: "=", count: 0 });
    });

    it("reads a line with no count as one or more", () => {
      expect(condition('HasExplicitMod "x" "y"')).toMatchObject({ operator: ">=", count: 1 });
    });

    it("reads a negated line with no count as exactly zero", () => {
      expect(condition('HasExplicitMod != "x"')).toMatchObject({ operator: "=", count: 0 });
    });

    it("keeps a bare leading number as a mod name when no operator is written", () => {
      expect(condition('HasExplicitMod 2 "x"')).toMatchObject({ values: ["2", "x"], count: 1 });
    });

    it("keeps a negated spaced count as an inequality on the count", () => {
      expect(condition('HasExplicitMod ! 2 "x"')).toMatchObject({ operator: "!", count: 2 });
    });

    it("refuses a count with no names after it", () => {
      expect(() => parseFilter(block("HasExplicitMod >=2"))).toThrow("HasExplicitMod needs at least one value");
    });
  });

  describe("transfigured gem", () => {
    it("accepts a gem name", () => {
      expect(condition('TransfiguredGem "Frostblink of Wintry Blast"').values).toEqual(["Frostblink of Wintry Blast"]);
    });

    it("refuses two values", () => {
      expect(() => parseFilter(block("TransfiguredGem a b"))).toThrow("TransfiguredGem takes exactly one value, got 2");
    });

    it("refuses a comparison operator", () => {
      expect(() => parseFilter(block("TransfiguredGem > True"))).toThrow('TransfiguredGem does not take the operator ">"');
    });
  });
});
