import { requireEnv } from "./env.ts";

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

function backoffMs(attempt: number, retryAfter: string | null): number {
  const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
  if (Number.isFinite(seconds)) return seconds * 1000;
  return 500 * 2 ** attempt;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GETs JSON from a pathofexile.com endpoint. GGG rate-limits aggressively and
 * blocks requests without an identifying user-agent, so both are handled here
 * rather than in each extract.
 */
export async function fetchJson(url: string): Promise<unknown> {
  const userAgent = requireEnv("POE_USER_AGENT");

  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      headers: { "user-agent": userAgent, accept: "application/json" },
    });

    if (response.ok) return await response.json();

    const retryable = RETRY_STATUS.has(response.status) && attempt < MAX_ATTEMPTS - 1;
    if (!retryable) {
      throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
    }

    const wait = backoffMs(attempt, response.headers.get("retry-after"));
    console.error(`  ${response.status} from ${url}, retrying in ${wait}ms`);
    await sleep(wait);
  }
}
