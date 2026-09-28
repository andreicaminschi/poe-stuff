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
    it("reads empty text as a filter with no blocks", () => {
      expect(parseFilter("")).toEqual([]); // degenerate input
    });

    it("reads one block with its keyword, header comment, header line, conditions and notes", () => {
      const text = "\nShow # header note\nBaseType \"Ring\"\n#@ tier=T1 verb=take";

      const result = parseFilter(text);

      expect(result).toEqual([
        {
          keyword: "Show",
          conditions: [{ name: "BaseType", kind: "strings", operator: "=", values: ["Ring"], comment: "", line: 3 }],
          notes: [
            { key: "tier", value: "T1", line: 4 },
            { key: "verb", value: "take", line: 4 },
          ],
          freehand: "",
          comment: "header note",
          continues: false,
          line: 2,
        },
      ]); // lines count from 1, the leading blank included
    });

    it("reads keywords and condition names in any letter case and gives them back spelled the game's way", () => {
      const result = only("hIDE\nbasetype \"Ring\"\n#@ tier=T1 verb=take");

      expect(result.keyword).toBe("Hide");
      expect(result.conditions[0]!.name).toBe("BaseType"); // canonical casing
    });

    it("reads Minimal as a block keyword", () => {
      expect(only("Minimal\n" + NOTE).keyword).toBe("Minimal"); // the less-known third keyword
    });

    it("splits two blocks in a row and keeps their order and header lines", () => {
      const result = parseFilter(`Show\n${NOTE}\nHide\n${NOTE}`);

      expect(result.map((b) => [b.keyword, b.line])).toEqual([
        ["Show", 1],
        ["Hide", 3],
      ]);
    });

    it("reads a filter saved with Windows line endings", () => {
      expect(parseFilter(`Show\r\n${NOTE}\r\n`)).toHaveLength(1); // \r would otherwise stick to the note
    });

    it("marks a block that has a Continue line", () => {
      expect(only(`Show\nContinue\n${NOTE}`).continues).toBe(true);
    });

    it("skips style lines without keeping them as conditions", () => {
      expect(only(block("SetFontSize 45", "PlayEffect Red")).conditions).toEqual([]); // actions are not evaluated
    });

    it("ignores comments that are not notes, including one glued to the note marker", () => {
      expect(only(`# top\nShow\n#@tier=T1\n${NOTE}`).notes).toHaveLength(2); // "#@" needs a space after it
    });

    it("refuses anything written after the keyword on the header line", () => {
      expect(() => parseFilter(`Show BaseType "x"\n${NOTE}`)).toThrow(
        "line 1: Show takes nothing after it, got \"BaseType \\\"x\\\"\"",
      );
    });

    it("refuses a condition before the first block", () => {
      expect(() => parseFilter("BaseType \"x\"")).toThrow("line 1: the condition BaseType before any Show, Hide or Minimal block");
    });

    it("refuses a style line before the first block", () => {
      expect(() => parseFilter("SetFontSize 45")).toThrow("line 1: the action SetFontSize before any Show, Hide or Minimal block");
    });

    it("refuses Continue before the first block", () => {
      expect(() => parseFilter("Continue")).toThrow("line 1: Continue before any Show, Hide or Minimal block");
    });

    it("refuses a condition after the block's note", () => {
      expect(() => parseFilter(`Show\n${NOTE}\nQuality > 5`)).toThrow("line 3: the condition Quality after the #@ note"); // note must close the block
    });

    it("refuses Continue after the block's note", () => {
      expect(() => parseFilter(`Show\n${NOTE}\nContinue`)).toThrow("line 3: Continue after the #@ note");
    });

    it("refuses a second note in the same block", () => {
      expect(() => parseFilter(`Show\n${NOTE}\n${NOTE}`)).toThrow("line 3: a #@ note after the #@ note");
    });

    it("refuses a block with no note and blames the line of the next block's header", () => {
      expect(() => parseFilter(`Show\nHide\n${NOTE}`)).toThrow("line 2: the block on line 1 has no #@ note"); // found when the next block opens
    });

    it("blames the last line of the text when the final block has no note", () => {
      expect(() => parseFilter("Show\n")).toThrow("line 2: the block on line 1 has no #@ note"); // trailing empty line counts
    });

    it("refuses an Import line", () => {
      expect(() => parseFilter("Import \"x.filter\"")).toThrow("line 1: Import is not supported");
    });

    it("refuses a misspelled condition name", () => {
      expect(() => parseFilter("Show\nBaseTyp \"x\"")).toThrow("line 2: unknown condition \"BaseTyp\"");
    });
  });

  describe("notes", () => {
    it("keeps the freehand text after the pairs exactly as written, double spaces and equals signs included", () => {
      const result = only("Show\n#@ tier=T2 verb=check  some  debug = text");

      expect(result.freehand).toBe("some  debug = text"); // freehand starts at the first word without "="
    });

    it("reads all four known keys in the order they were written", () => {
      const result = only("Show\n#@ tier=T1 upto=T0 verb=gamble family=gems");

      expect(result.notes.map((n) => `${n.key}=${n.value}`)).toEqual(["tier=T1", "upto=T0", "verb=gamble", "family=gems"]);
    });

    it("refuses a key that appears twice in one note", () => {
      expect(() => parseFilter("Show\n#@ tier=T1 verb=take tier=T2")).toThrow("line 2: note key \"tier\" appears twice");
    });

    it("reads a quoted value that holds no spaces without its quotes", () => {
      expect(only("Show\n#@ tier=\"T1\" verb=take").notes[0]!.value).toBe("T1");
    });

    it("refuses a note marker with nothing after it", () => {
      expect(() => parseFilter("Show\n#@")).toThrow("line 2: a #@ note needs tier and verb, and this one has no tier");
    });

    it("refuses a note with no verb", () => {
      expect(() => parseFilter("Show\n#@ tier=T1")).toThrow("line 2: a #@ note needs tier and verb, and this one has no verb");
    });

    it("refuses a key the note does not know", () => {
      expect(() => parseFilter("Show\n#@ tier=T1 verb=take colour=red")).toThrow("line 2: unknown note key \"colour\"");
    });

    it("refuses a key written with a capital letter", () => {
      expect(() => parseFilter("Show\n#@ Tier=T1 verb=take")).toThrow("line 2: bad note pair \"Tier=T1\""); // keys are lower case only
    });

    it("refuses a key with nothing after its equals sign", () => {
      expect(() => parseFilter("Show\n#@ tier= verb=take")).toThrow("line 2: bad note pair \"tier=\"");
    });

    it("refuses a value in the wrong case and lists the ones allowed", () => {
      expect(() => parseFilter("Show\n#@ tier=T1 verb=Take")).toThrow("line 2: verb takes one of take, check, gamble, got \"Take\""); // values are case-sensitive
    });

    it("refuses a quoted value that never closes", () => {
      expect(() => parseFilter("Show\n#@ tier=\"T1 verb=take")).toThrow("line 2: unterminated quote in note");
    });

    it("treats a note written after a condition as that condition's ordinary comment", () => {
      const result = only(block("Quality > 5 #@ tier=T3 verb=check"));

      expect(result.conditions[0]!.comment).toBe("@ tier=T3 verb=check");
      expect(result.notes.map((n) => n.value)).toEqual(["T1", "take"]); // only a line starting with #@ is a note
    });
  });

  describe("comments and quotes", () => {
    it("keeps a hash inside quotes as part of the name", () => {
      expect(condition("BaseType \"A#B\" # why").values).toEqual(["A#B"]); // the comment starts at the unquoted #
    });

    it("keeps the comment after a condition, trimmed and without its hash", () => {
      expect(condition("Quality > 5   #  from bucket x  ").comment).toBe("from bucket x");
    });

    it("keeps a quoted name with spaces as one name beside an unquoted one", () => {
      expect(condition("BaseType == \"Two Stone Ring\" Coral").values).toEqual(["Two Stone Ring", "Coral"]);
    });

    it("reads an empty quoted name as an empty string", () => {
      expect(condition("BaseType \"\"").values).toEqual([""]); // "" substring-matches every base type
    });

    it("refuses a quote that never closes", () => {
      expect(() => parseFilter(block("BaseType \"Ring"))).toThrow("line 2: unterminated quote");
    });
  });

  describe("operators", () => {
    it("reads a condition with no operator as a single equals", () => {
      expect(condition("Quality 5").operator).toBe("=");
    });

    it("refuses an operator with no value after it", () => {
      expect(() => parseFilter(block("Quality >="))).toThrow("line 2: Quality needs at least one value");
    });

    it("reads an operator glued to its number as a value, not an operator", () => {
      expect(() => parseFilter(block("Quality >=5"))).toThrow("line 2: Quality takes a number, got \">=5\""); // only counted conditions glue
    });
  });

  describe("yes-or-no conditions", () => {
    it("accepts true in lower case and keeps it as written", () => {
      expect(condition("Corrupted true").values).toEqual(["true"]);
    });

    it("accepts not-equals", () => {
      expect(condition("Corrupted != False").operator).toBe("!=");
    });

    it("refuses more-than", () => {
      expect(() => parseFilter(block("Corrupted > True"))).toThrow("line 2: Corrupted does not take the operator \">\"");
    });

    it("refuses a word other than True or False", () => {
      expect(() => parseFilter(block("Corrupted Yes"))).toThrow("line 2: Corrupted takes True or False, got \"Yes\"");
    });

    it("refuses two values", () => {
      expect(() => parseFilter(block("Corrupted True False"))).toThrow("line 2: Corrupted takes exactly one value, got 2");
    });
  });

  describe("number conditions", () => {
    it("reads at-most with its number", () => {
      expect(condition("ItemLevel <= 84")).toMatchObject({ operator: "<=", values: ["84"] });
    });

    it("refuses a number written in hex", () => {
      expect(() => parseFilter(block("Quality 0x10"))).toThrow("takes a number"); // Number() would accept it
    });

    it("refuses a number written with an exponent", () => {
      expect(() => parseFilter(block("Quality 1e3"))).toThrow("takes a number"); // Number() would accept it
    });

    it("refuses a word where a number belongs", () => {
      expect(() => parseFilter(block("Quality high"))).toThrow("line 2: Quality takes a number, got \"high\"");
    });

    it("refuses a quoted space", () => {
      expect(() => parseFilter(block("Quality \" \""))).toThrow("line 2: Quality takes a number, got \" \""); // Number(" ") is 0
    });

    it("refuses Infinity", () => {
      expect(() => parseFilter(block("Quality Infinity"))).toThrow("takes a number"); // Number() would accept it
    });
  });

  describe("rarity", () => {
    it("reads three rarities under equals as a list of any of them", () => {
      expect(condition("Rarity Normal Magic Rare").values).toEqual(["Normal", "Magic", "Rare"]);
    });

    it("reads one lower-case rarity under at-least", () => {
      expect(condition("Rarity >= rare")).toMatchObject({ kind: "ordered", operator: ">=", values: ["rare"] });
    });

    it("refuses two rarities under more-than", () => {
      expect(() => parseFilter(block("Rarity > Normal Magic"))).toThrow("line 2: Rarity takes exactly one value, got 2"); // a comparison needs one rung
    });

    it("refuses a rarity the game does not have", () => {
      expect(() => parseFilter(block("Rarity Relic"))).toThrow("line 2: Rarity takes one of Normal, Magic, Rare, Unique, got \"Relic\"");
    });
  });

  describe("influences", () => {
    it("accepts known influences in any case, None included", () => {
      expect(condition("HasInfluence shaper None").values).toEqual(["shaper", "None"]);
    });

    it("refuses an influence the game does not have", () => {
      expect(() => parseFilter(block("HasInfluence Eater"))).toThrow(
        "HasInfluence takes one of Shaper, Elder, Crusader, Hunter, Redeemer, Warlord, None, got \"Eater\"",
      );
    });

    it("refuses at-least", () => {
      expect(() => parseFilter(block("HasInfluence >= Shaper"))).toThrow("HasInfluence does not take the operator \">=\"");
    });
  });

  describe("name conditions", () => {
    it("refuses more-than", () => {
      expect(() => parseFilter(block("Class > \"Rings\""))).toThrow("Class does not take the operator \">\"");
    });

    it("accepts a class the game does not have, since names are not checked", () => {
      expect(condition("Class NotARealClass").values).toEqual(["NotARealClass"]); // no whitelist
    });
  });

  describe("socket conditions", () => {
    it("reads a count and colours written together", () => {
      expect(condition("SocketGroup >= 5GGG").sockets).toEqual({ count: 5, colours: { G: 3 } });
    });

    it("reads colours with no count", () => {
      expect(condition("Sockets AAAA").sockets).toEqual({ colours: { A: 4 } }); // count key absent
    });

    it("reads a count with no colours", () => {
      expect(condition("Sockets >= 6").sockets).toEqual({ count: 6, colours: {} });
    });

    it("reads colour letters written in lower case", () => {
      expect(condition("SocketGroup rgbw").sockets).toEqual({ colours: { R: 1, G: 1, B: 1, W: 1 } });
    });

    it("refuses a letter that is not a socket colour", () => {
      expect(() => parseFilter(block("Sockets RX"))).toThrow("Sockets does not know the socket colour \"X\"");
    });

    it("refuses colours written before the count", () => {
      expect(() => parseFilter(block("Sockets GG5"))).toThrow("Sockets takes a count and colours, got \"GG5\"");
    });

    it("refuses an empty quoted socket spec", () => {
      expect(() => parseFilter(block("Sockets \"\""))).toThrow("Sockets takes a count and colours, got \"\"");
    });

    it("refuses two socket specs", () => {
      expect(() => parseFilter(block("Sockets 5 RGB"))).toThrow("Sockets takes exactly one value, got 2");
    });
  });

  describe("mod-count conditions", () => {
    it("reads a count glued to its operator, then the mod names", () => {
      expect(condition("HasExplicitMod >=2 \"of Haast\" Tyrannical")).toMatchObject({ operator: ">=", count: 2, values: ["of Haast", "Tyrannical"] });
    });

    it("reads a count separated from its operator by a space", () => {
      expect(condition("HasExplicitMod >= 2 \"of Haast\"")).toMatchObject({ operator: ">=", count: 2, values: ["of Haast"] });
    });

    it("reads a glued zero as none of the listed mods", () => {
      expect(condition("HasEnchantment =0 \"x\"")).toMatchObject({ operator: "=", count: 0 });
    });

    it("reads a line with no count as one or more of the listed mods", () => {
      expect(condition("HasExplicitMod \"x\" \"y\"")).toMatchObject({ operator: ">=", count: 1 }); // implicit ">= 1"
    });

    it("reads a negated line with no count as exactly none of the listed mods", () => {
      expect(condition("HasExplicitMod != \"x\"")).toMatchObject({ operator: "=", count: 0 }); // rewritten to "= 0"
    });

    it("keeps a leading number as a mod name when no operator is written", () => {
      expect(condition("HasExplicitMod 2 \"x\"")).toMatchObject({ values: ["2", "x"], count: 1 }); // a count needs an operator
    });

    it("keeps a spaced count after not as an inequality on the count", () => {
      expect(condition("HasExplicitMod ! 2 \"x\"")).toMatchObject({ operator: "!", count: 2 }); // not rewritten to "= 0"
    });

    it("refuses a count with no mod names after it", () => {
      expect(() => parseFilter(block("HasExplicitMod >=2"))).toThrow("HasExplicitMod needs at least one value");
    });
  });

  describe("transfigured gems", () => {
    it("accepts a quoted gem name", () => {
      expect(condition("TransfiguredGem \"Frostblink of Wintry Blast\"").values).toEqual(["Frostblink of Wintry Blast"]);
    });

    it("refuses two values", () => {
      expect(() => parseFilter(block("TransfiguredGem a b"))).toThrow("TransfiguredGem takes exactly one value, got 2");
    });

    it("refuses more-than", () => {
      expect(() => parseFilter(block("TransfiguredGem > True"))).toThrow("TransfiguredGem does not take the operator \">\"");
    });
  });
});
