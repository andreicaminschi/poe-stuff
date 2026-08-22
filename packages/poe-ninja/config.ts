import { requireEnv } from "@util/core/env";

/**
 * Base of the poe.ninja API. The trailing slash is stripped so joins stay predictable.
 *
 * A function rather than a constant, because `requireEnv` must throw at first use and not
 * at import — every package here loads its own `.env` through `node --env-file=`, and a
 * module-level read would fire before that ever happened.
 */
export const apiUrl = (): string =>
  requireEnv("POE_NINJA_BASE_URL").replace(/\/$/, "");

/**
 * The realm and game every path in this package sits under.
 *
 * poe.ninja serves PoE2 from `/poe2/` behind the same shapes. Nothing here is generic
 * over that yet, and pretending otherwise would be a parameter no caller could pass a
 * second value to.
 */
export const GAME_PATH = "poe1";
