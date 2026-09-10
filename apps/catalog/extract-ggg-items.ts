import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractGGGItems: Step = {
  id: "ggg-items",
  stage: "bronze",
  source: "ggg",

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
