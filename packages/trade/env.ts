/**
 * Self-contained on purpose: the executor is meant to run detached from the ETL
 * package, so it does not import `@poe/etl` for two helpers.
 */

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

export function requireEnv(name: string): string {
  const value = optionalEnv(name);
  if (value === undefined) {
    throw new Error(
      `Missing ${name}. Run with: node --env-file=packages/trade/.env packages/trade/tools/<tool>.ts`,
    );
  }
  return value;
}

/** Base of the trade API, e.g. `https://www.pathofexile.com/api/trade`. */
export const tradeApiUrl = () => requireEnv("POE_TRADE_API_URL").replace(/\/$/, "");

export const userAgent = () => requireEnv("POE_USER_AGENT");

export const league = () => requireEnv("POE_LEAGUE");

export const redisUrl = () => requireEnv("REDIS_URL");
