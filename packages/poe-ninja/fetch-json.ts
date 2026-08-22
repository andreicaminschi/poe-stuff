import { cacheKey } from "@util/core/cache-key";
import { optionalEnv, requireEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { sleep } from "@util/core/sleep";
import { apiUrl } from "./config.ts";

const HOUR_MS = 3_600_000;

/** How long to wait before the one retry. Long enough to outlast a burst, short enough
 * that a 46-request fan-out does not stall on it. */
const RETRY_DELAY_MS = 2_000;

/** Statuses worth asking twice about: rate limiting, and the server having a bad moment. */
const RETRIABLE = (status: number): boolean => status === 429 || status >= 500;

/**
 * One GET against poe.ninja, cached on disk under an hour key.
 *
 * **The hour is the whole cache policy, and it is also how their terms are honoured.**
 * poe.ninja serves these with `Cache-Control: max-age=1800` and asks clients not to poll
 * faster than minutes; an hour key means a re-run inside the hour makes no request at
 * all, which is stricter than what they ask for. Conditional requests are deliberately
 * not implemented — a `304` after the hour would leave nothing to store, since the body
 * is the thing being cached, so revalidating would cost a request and save nothing.
 *
 * The path and every query parameter go into the key. Two types of one league are two
 * entries, and an entry written for `UniqueArmour` can never be read back as `BaseType`.
 *
 * `POE_NINJA_CACHE_DIR` naming a folder is the whole switch — unset means every call goes
 * to poe.ninja. poe.ninja is not GGG and publishes no rate limits, so nothing here is
 * paced against a budget; the retry exists for a bad answer, not for a quota.
 *
 * The body is asserted, not validated: callers that care hand the result to a schema.
 */
export async function fetchJson<T>(
  path: string,
  query: Readonly<Record<string, string>>,
): Promise<T> {
  const root = optionalEnv("POE_NINJA_CACHE_DIR");
  const cache = root === undefined ? undefined : fileCache<T>(root);

  const parameters = Object.entries(query).sort(([left], [right]) =>
    left < right ? -1 : 1,
  );

  const key = cacheKey(
    "poe-ninja",
    path,
    ...parameters.flatMap(([name, value]) => [name, value]),
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const search = new URLSearchParams(parameters).toString();
  const url = `${apiUrl()}/${path}${search === "" ? "" : `?${search}`}`;

  const body = await request<T>(url);
  await cache?.set(key, body);

  return body;
}

/**
 * The request itself, with one retry.
 *
 * Only 429 and 5xx are asked twice. A 404 is an endpoint that does not exist and a 400 is
 * a query that is wrong, and asking either of those again is how a typo becomes two
 * requests instead of one error.
 */
async function request<T>(url: string): Promise<T> {
  const first = await fetch(url, {
    headers: {
      "user-agent": requireEnv("POE_USER_AGENT"),
      accept: "application/json",
    },
  });

  if (first.ok) return (await first.json()) as T;

  if (!RETRIABLE(first.status)) {
    throw new Error(`poe-ninja ${first.status} for ${url}`);
  }

  await sleep(RETRY_DELAY_MS);

  const second = await fetch(url, {
    headers: {
      "user-agent": requireEnv("POE_USER_AGENT"),
      accept: "application/json",
    },
  });

  if (!second.ok) {
    throw new Error(`poe-ninja ${second.status} for ${url} (twice)`);
  }

  return (await second.json()) as T;
}
