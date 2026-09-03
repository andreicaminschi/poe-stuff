import { APPLY_KEYS } from "@poe/filter-eval/filter-ast";
import { z } from "zod";
import type { Config } from "./types.ts";

const tier = z
  .object({
    name: z.enum(APPLY_KEYS.tier),
    min: z.number().nonnegative(),
    actions: z.array(z.string().min(1)).default([]),
  })
  .strict();

const schema = z
  .object({
    catalog: z.string().min(1),
    output: z.string().min(1),
    tiers: z.array(tier).min(1),
    uniques: z.object({ corruptionMin: z.number().nonnegative() }).strict(),
  })
  .strict();

/**
 * Checks parsed JSON against `Config` and hands it back, typed.
 *
 * A tier name has to be one the `#@` note can carry, because the tier is written into every
 * block's note and `parseFilter` refuses any other value — so the config fails here, naming
 * the file, rather than after the whole filter was built.
 */
export function readConfig(value: unknown, source: string): Config {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new Error(`${source} is not a config:\n${z.prettifyError(parsed.error)}`);
  }

  const names = parsed.data.tiers.map((one) => one.name);
  const repeated = names.find((name, index) => names.indexOf(name) !== index);

  if (repeated !== undefined) {
    throw new Error(`${source}: tier ${repeated} is listed twice`);
  }

  return parsed.data;
}
