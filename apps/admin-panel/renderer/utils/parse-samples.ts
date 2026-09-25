import type { SampleSet } from "../../api/taxonomy/types.ts";

export type ParsedSamples = { readonly samples: readonly SampleSet[] } | { readonly problem: string };

const isSet = (value: unknown): boolean => typeof value === "object" && value !== null && !Array.isArray(value);

/** The Samples box as sample sets. Empty text is no sets. */
export function parseSamples(text: string): ParsedSamples {
  if (text.trim() === "") return { samples: [] };

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { problem: `Samples is not JSON: ${error instanceof Error ? error.message : String(error)}` };
  }

  if (!Array.isArray(value) || !value.every(isSet)) return { problem: "Samples must be a list of objects." };
  return { samples: value as readonly SampleSet[] };
}
