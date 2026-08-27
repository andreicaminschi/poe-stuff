/**
 * Run one job per name, a few at a time, and say which name failed.
 *
 * **Both fan-outs here are 18 or 28 requests for one league**, where PoeWatch answers the
 * same question in one. That is the shape of poe.ninja's API rather than a choice, and it
 * leaves two things to get right:
 *
 * - **Concurrency is bounded.** Their terms ask callers to be reasonable with it, and a
 *   flat `Promise.all` over 28 types would open 28 sockets at once for a service that
 *   asks nothing of anyone. Four is enough to make the fan-out fast and small enough to
 *   be polite.
 * - **A failure names itself.** A type that never answers throws with its own name in the
 *   message, because the alternative is a market that is quietly short by a few hundred
 *   items — a filter built on it would look perfectly well-formed and be missing every
 *   unique piece of armour in the game.
 *
 * The first failure wins and the rest of the run is abandoned. There is no partial
 * answer: half a market is not a market.
 */
const CONCURRENCY = 4;

export async function fanOut<Name extends string, Result>(
  names: readonly Name[],
  job: (name: Name) => Promise<Result>,
): Promise<readonly Result[]> {
  const results: Result[] = new Array<Result>(names.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const at = next;
      next += 1;
      if (at >= names.length) return;

      const name = names[at];
      if (name === undefined) return;

      try {
        results[at] = await job(name);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`poe-ninja: ${name} failed: ${reason}`, { cause: error });
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, names.length) }, worker),
  );

  return results;
}
