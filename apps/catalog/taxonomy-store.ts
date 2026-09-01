import type { TaxonomyStore } from "@poe/taxonomy/types";
import type { Lake } from "./types.ts";

/**
 * The taxonomy as files in the lake this run is already writing to.
 *
 * What `yarn taxonomy:publish` wrote is right there under the same root, so a local run
 * needs nothing served and nothing configured.
 */
export const lakeStore = (lake: Lake): TaxonomyStore => ({
  read: async (key) =>
    (await lake.exists(key)) ? lake.readJson<unknown>(key) : undefined,
});

/**
 * The taxonomy over HTTP, which is what an object in a bucket looks like once deployed.
 *
 * A `404` is the missing-key answer the store contract asks for; every other bad status is
 * raised, because a `403` on a bucket is a misconfiguration and answering `undefined` would
 * report it as "no taxonomy published yet".
 */
export const urlStore = (baseUrl: string): TaxonomyStore => ({
  async read(key) {
    const url = `${baseUrl.replace(/\/$/, "")}/${key}`;
    const response = await fetch(url);

    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new Error(`${url} answered ${response.status}`);
    }

    return (await response.json()) as unknown;
  },
});
