import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/**
 * The three cluster jewel sizes and every passive each can be enchanted with.
 *
 * Collected for one pairing: the enchant's mod text, which is what PoeWatch writes into a
 * listing's name, against the passive's name, which is what `EnchantmentPassiveNode` asks
 * for. Nothing in silver reads it yet — the taxonomy's authored cluster rows are seeded off
 * it by hand.
 */
export const extractRepoeClusterJewels: Step = {
  id: "repoe-cluster-jewels",
  stage: "bronze",

  async run({ lake, runId, repoe }) {
    const jewels = await repoe.getClusterJewels();
    const key = bronzeKey(runId, BRONZE_FILES.repoeClusterJewels);

    await lake.writeJson(key, jewels);

    return { keys: [key], rows: Object.keys(jewels).length };
  },
};
