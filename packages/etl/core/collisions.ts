/**
 * GGG reuses ids for distinct texts in more than one endpoint (stats and static
 * both do it), so nothing may be keyed by id. Collisions are reported in the
 * artifacts rather than silently collapsed.
 */
export type Collision = {
  readonly id: string;
  readonly texts: readonly string[];
};

export function findCollisions(rows: readonly { id: string; text: string }[]): Collision[] {
  const textsById = new Map<string, string[]>();
  for (const row of rows) {
    const texts = textsById.get(row.id);
    if (texts === undefined) textsById.set(row.id, [row.text]);
    else texts.push(row.text);
  }

  return [...textsById]
    .filter(([, texts]) => texts.length > 1)
    .map(([id, texts]) => ({ id, texts: [...texts].sort() }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
