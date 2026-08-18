import type { CallEvent } from "@poe/ggg/types";

/**
 * One JSON object per line on stdout. That is the shape CloudWatch splits into
 * queryable fields by itself and the shape `jq` reads locally, so the same worker
 * is debuggable in both places with no transport, no sink and no dependency —
 * whatever runs it owns where stdout goes.
 *
 * `labels` is how a line finds its way back to the search that produced it: `call`
 * deliberately has no vocabulary for searches or pages, so the context is bound
 * here, at the only layer that knows it.
 */
export function logEvents(
  labels: Record<string, string>,
): (event: CallEvent) => void {
  return (event) => {
    console.log(
      JSON.stringify({ ts: new Date().toISOString(), ...labels, ...event }),
    );
  };
}
