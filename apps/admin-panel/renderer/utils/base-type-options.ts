import type { Draft } from "../../api/taxonomy/types.ts";
import type { ValueOption } from "../types.ts";

/**
 * Every base type the draft names: a plain row's name, and an authored row's `baseType`.
 *
 * A value an authored row gives is labelled with that row, so it reads as authored rather than
 * as something the game data named.
 */
export function baseTypeOptions(draft: Draft): readonly ValueOption[] {
  const authoredBy = new Map<string, string[]>();
  const plain = new Set<string>();

  for (const item of Object.values(draft.items)) {
    if (item.source === "ggg") {
      plain.add(item.name);
      continue;
    }

    if (item.baseType === "") continue;
    authoredBy.set(item.baseType, [...(authoredBy.get(item.baseType) ?? []), item.name]);
  }

  return [...new Set([...plain, ...authoredBy.keys()])]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => {
      const rows = authoredBy.get(value);
      return rows === undefined ? { value } : { value, label: `authored: ${rows.join(", ")}` };
    });
}
