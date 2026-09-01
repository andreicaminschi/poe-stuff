import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/**
 * The trade site's own item list: every name it will let you search for, grouped into the
 * categories it shows.
 *
 * What lands in bronze is the service's return value, not the wire payload — `getItemData`
 * restructures each entry before this ever sees it. That is the contract on purpose: the
 * service decides what an item from GGG looks like, and a replay reads back exactly what
 * the rest of the pipeline was written against.
 */
export const extractGGGItems: Step = {
  id: "ggg-items",
  stage: "bronze",

  async run({ lake, runId, ggg }) {
    const groups = await ggg.getItemData();
    const key = bronzeKey(runId, BRONZE_FILES.gggItems);

    await lake.writeJson(key, groups);

    return {
      keys: [key],
      rows: groups.reduce((total, group) => total + group.items.length, 0),
    };
  },
};
