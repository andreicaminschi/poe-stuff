import { copyFile, stat, writeFile, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { styleFilter } from "./style-filter.ts";

/**
 * Style the proto filter, and put the result where the game looks for it.
 *
 *     node packages/filter/style-cli.ts
 *     node packages/filter/style-cli.ts --in packages/filter/proto.filter
 *     node packages/filter/style-cli.ts --game-dir "D:/poe/filters"
 *     node packages/filter/style-cli.ts --no-install
 *
 * Reads no env and touches no network. The proto already holds every decision; this only
 * writes down how to draw them.
 *
 * The output is checked before it is installed. A styled file has to parse back to the same
 * blocks, carrying the same notes and the same number of conditions as the proto — actions
 * cannot change what an item matches, so anything that moved is this file's bug, and a
 * filter with a bug in it does not belong in the game folder.
 */

const DEFAULT_IN = "packages/filter/proto.filter";
const DEFAULT_OUT = "packages/filter/poe-stuff.filter";

/** Where Path of Exile reads filters from, on the machine this is running on. */
const gameDir = (): string =>
  join(homedir(), "Documents", "My Games", "Path of Exile");

const args = process.argv.slice(2);

/** One flag's value, spelled either way. Same rule as `filter-cli.ts`. */
const flag = (name: string): string | undefined => {
  const joined = args.find((arg) => arg.startsWith(`--${name}=`));
  if (joined !== undefined) return joined.slice(name.length + 3);

  const at = args.indexOf(`--${name}`);
  return at < 0 ? undefined : args[at + 1];
};

const from = flag("in") ?? DEFAULT_IN;
const out = flag("out") ?? DEFAULT_OUT;

const proto = await readFile(from, "utf8");
const styled = styleFilter(proto);

/**
 * What has to survive styling, per block.
 *
 * Not the whole block: the actions are the point and are meant to differ. What may not move
 * is anything the game matches on, and the note saying what the block was for.
 */
const shape = (text: string): string[] =>
  parseFilter(text).map((block) =>
    [
      block.keyword,
      block.conditions.length,
      ...block.notes.map((note) => `${note.key}=${note.value}`),
    ].join(" "),
  );

const before = shape(proto);
// The hide layer and the catch-all are the two blocks styling adds, both at the end.
const after = shape(styled).slice(0, before.length);

const moved = before.flatMap((was, index) =>
  after[index] === was ? [] : [`block ${index + 1}: was "${was}", now "${after[index]}"`],
);

if (moved.length > 0) {
  console.error(
    [`styling changed what ${moved.length} blocks match:`, ...moved.slice(0, 10)].join("\n"),
  );
  process.exitCode = 1;
} else {
  await writeFile(out, styled);

  const actions = styled
    .split("\n")
    .filter((line) => /^\t(Set|Play|Minimap)/.test(line)).length;

  const reported = [
    `${before.length} blocks styled, ${actions} action lines, hide layer and catch-all added`,
    `wrote ${out}`,
  ];

  const dir = flag("game-dir") ?? gameDir();

  if (args.includes("--no-install")) {
    reported.push(`not installed (--no-install). The game folder is ${dir}`);
  } else {
    const installed = await stat(dir).then(
      (found) => found.isDirectory(),
      () => false,
    );

    if (installed) {
      const target = join(dir, "poe-stuff.filter");
      await copyFile(out, target);
      reported.push(`installed ${target}`);
    } else {
      // Not an error. The pipeline runs on machines with no game on them, and a missing
      // folder means exactly that rather than something going wrong.
      reported.push(`no game folder at ${dir}, so nothing was installed`);
    }
  }

  console.error(reported.join("\n"));
}
