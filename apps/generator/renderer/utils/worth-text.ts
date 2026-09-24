import type { Placement } from "@poe/filter-style/types";

const chaos = (value: number | undefined): string =>
  value === undefined ? "-" : `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}c`;

/** A placement's price, or its stack range in a stack-size category. */
export function worthText(placement: Placement): string {
  const { stack } = placement;
  if (stack === undefined) return chaos(placement.item.prices[placement.verb]);
  if (stack.ceiling === undefined) return `stack ${stack.floor}+`;

  return `stack ${stack.floor}-${stack.ceiling}`;
}
