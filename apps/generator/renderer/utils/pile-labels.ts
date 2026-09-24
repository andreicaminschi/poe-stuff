import type { Loot } from "./loot-pool.ts";

/** Label font pixels per filter size point, read off FilterBlade's preview. */
export const PIXELS_PER_POINT = 1;
export const PAD = 0.28;
export const ICON = 0.62;
const LINE = 1.2;
const STEPS = 600;
const REACH = 260;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export type Piled = Loot & Box & { readonly px: number; readonly gx: number; readonly gy: number };

const hits = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function spotFor(placed: readonly Piled[], w: number, h: number, gx: number, gy: number): Box | undefined {
  for (let step = 0; step < STEPS; step += 1) {
    const y = gy - h / 2 + (step % 2 === 0 ? 1 : -1) * Math.ceil(step / 2) * 2;
    const row = placed.filter((one) => one.y < y + h && y < one.y + one.h);
    const free = [gx - w / 2, ...row.flatMap((one) => [one.x + one.w, one.x - w])]
      .filter((x) => Math.abs(x + w / 2 - gx) < REACH)
      .map((x) => ({ x, y, w, h }))
      .find((box) => !placed.some((one) => hits(one, box)));
    if (free !== undefined) return free;
  }
  return undefined;
}

/**
 * Stacks labels the way the client does: each wants to sit over the spot its item fell on,
 * and one that collides slides beside a neighbour or steps up or down until it is clear.
 */
export function pileLabels(
  drops: readonly Loot[],
  width: number,
  height: number,
  measure: (text: string, px: number) => number,
): readonly Piled[] {
  const placed: Piled[] = [];

  for (const drop of drops) {
    const px = drop.style.fontSize * PIXELS_PER_POINT;
    const h = Math.round(px * LINE) + 2;
    const w = Math.round(measure(drop.name, px) + px * PAD * 2 + (drop.style.icon === null ? 0 : px * (ICON + 0.3)) + 2);
    const gx = width / 2 + (Math.random() - 0.5) * 240;
    const gy = height / 2 + (Math.random() - 0.5) * 120;
    const spot = spotFor(placed, w, h, gx, gy) ?? { x: gx - w / 2, y: gy, w, h };

    placed.push({ ...drop, ...spot, px, gx, gy });
  }

  return placed;
}
