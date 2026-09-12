import type { Form } from "../../api/panel-api.ts";

const KEYS = ["itemLevel", "linkCount", "gemLevel", "gemQuality", "mapTier"] as const;

/** Highest form first, then the most listed. */
export function compareForms(a: Form, b: Form): number {
  for (const key of KEYS) {
    const diff = (b[key] ?? 0) - (a[key] ?? 0);
    if (diff !== 0) return diff;
  }

  return b.daily - a.daily;
}
