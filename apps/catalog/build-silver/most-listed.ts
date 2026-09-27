/** The one with the most listings behind it, ties to the higher mean. */
export const mostListed = <T extends { readonly daily: number; readonly mean: number }>(
  candidates: readonly T[],
): T | undefined =>
  candidates.reduce<T | undefined>(
    (best, one) =>
      best === undefined || one.daily > best.daily || (one.daily === best.daily && one.mean > best.mean)
        ? one
        : best,
    undefined,
  );
