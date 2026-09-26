import { jest } from "@jest/globals";
import type { GggContext, RateLimiter } from "./types.ts";

export const UA = "test-agent/1.0 (contact: a@b.test)";

export const freeLimiter: RateLimiter = {
  acquire: async () => {},
  explainWait: () => undefined,
  setRules: () => {},
  observe: () => {},
  penalize: () => {},
};

export const context: GggContext = {
  limiter: freeLimiter,
  tradeApiUrl: "https://trade.test/api",
  currencyApiUrl: "https://cdn.test/cx",
  userAgent: UA,
};

export function stubFetch(...bodies: unknown[]): jest.Mock<typeof fetch> {
  const mock = jest.fn<typeof fetch>();
  for (const body of bodies) {
    mock.mockImplementationOnce(async () => new Response(JSON.stringify(body)));
  }
  jest.spyOn(globalThis, "fetch").mockImplementation(mock);
  return mock;
}
