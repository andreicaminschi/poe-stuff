import { cacheKey } from "@util/cache/cache-key";
import { sleep } from "@util/cache/sleep";
import { PoeNinjaHttpError } from "./errors.ts";
import type { PoeNinjaContext } from "./types.ts";

const HOUR_MS = 3_600_000;

/** How long to wait before the one retry. Long enough to outlast a burst, short enough
 * that a 46-request fan-out does not stall on it. */
const RETRY_DELAY_MS = 2_000;

/** Statuses worth asking twice about: rate limiting, and the server having a bad moment. */
const RETRIABLE = (status: number): boolean => status === 429 || status >= 500;

/**
 * One GET against poe.ninja, cached under an hour key.
 *
 * **The hour is the whole cache policy, and it is also how their terms are honoured.**
 * poe.ninja serves these with `Cache-Control: max-age=1800` and asks clients not to poll
 * faster than minutes; an hour key means a re-run inside the hour makes no request at
 * all, which is stricter than what they ask for. Conditional requests are deliberately
 * not implemented — a `304` after the hour would leave nothing to store, since the body
 * is the thing being cached, so revalidating would cost a request and save nothing.
 *
 * The path and every query parameter go into the key through the URL. Two types of one
 * league are two entries, and an entry written for `UniqueArmour` can never be read back
 * as `BaseType`.
 *
 * poe.ninja is not GGG and publishes no rate limits, so nothing here is paced against a
 * budget; the retry exists for a bad answer, not for a quota.
 *
 * The body is asserted, not validated: callers that care hand the result to a schema.
 */
export async function fetchJson<T>(
  path: string,
  query: Readonly<Record<string, string>>,
  { baseUrl, userAgent, cache }: PoeNinjaContext,
): Promise<T> {
  // Sorted, so two call sites spelling the same query in a different order key alike.
  const parameters = Object.entries(query).sort(([left], [right]) =>
    left < right ? -1 : 1,
  );

  const search = new URLSearchParams(parameters).toString();
  const url = `${baseUrl}/${path}${search === "" ? "" : `?${search}`}`;

  const key =
    cache && cacheKey("poe-ninja", url, String(Math.floor(Date.now() / HOUR_MS)));

  if (cache && key) {
    const cached = await cache.get(key);
    if (cached) return cached.body as T;
  }

  const { body, status } = await request<T>(url, userAgent);

  if (cache && key) {
    await cache.set(key, {
      url,
      status,
      body,
      storedAt: new Date().toISOString(),
    });
  }

  return body;
}

/** The request itself, with one retry on the statuses worth asking twice about. */
async function request<T>(
  url: string,
  userAgent: string,
): Promise<{ body: T; status: number }> {
  const headers = { "user-agent": userAgent, accept: "application/json" };

  const first = await fetch(url, { headers });
  if (first.ok) return { body: (await first.json()) as T, status: first.status };

  if (!RETRIABLE(first.status)) {
    throw new PoeNinjaHttpError(url, first.status, 1);
  }

  await sleep(RETRY_DELAY_MS);

  const second = await fetch(url, { headers });
  if (!second.ok) throw new PoeNinjaHttpError(url, second.status, 2);

  return { body: (await second.json()) as T, status: second.status };
}
