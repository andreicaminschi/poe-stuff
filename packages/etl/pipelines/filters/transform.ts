import { FILTER_KINDS } from "./domain.ts";
import type { Filter, FilterGroup, FilterKind, Filters, FilterTotals } from "./domain.ts";
import type { RawFilter, RawFilterGroup, RawFilters } from "./raw.ts";

export function transformFilters(raw: RawFilters): Filters {
  const groups = raw.result.map(toGroup);
  const filters = groups.flatMap((group) => group.filters);

  return {
    totals: {
      groups: groups.length,
      filters: filters.length,
      byKind: countByKind(filters),
    },
    groups,
  };
}

/** Panel order matches the trade site top to bottom, so it is kept as-is. */
function toGroup(group: RawFilterGroup): FilterGroup {
  const filters = group.filters.map((filter) => toFilter(filter, group.id));
  return {
    id: group.id,
    title: group.title ?? null,
    hidden: group.hidden ?? false,
    count: filters.length,
    filters,
  };
}

/**
 * Filter order within a panel is meaningful too, so unlike the other domains
 * nothing is re-sorted here.
 */
function toFilter(filter: RawFilter, group: string): Filter {
  return {
    id: filter.id,
    group,
    label: filter.text ?? null,
    kind: kindOf(filter),
    tip: filter.tip ?? null,
    placeholder: filter.input?.placeholder ?? null,
    options: (filter.option?.options ?? []).map((option) => ({
      value: option.id,
      label: option.text,
    })),
    knownItem:
      filter.option?.knownItem === undefined
        ? null
        : {
            uniques: filter.option.knownItem.uniques ?? false,
            cards: filter.option.knownItem.cards ?? false,
            currency: filter.option.knownItem.currency ?? false,
          },
    layout: {
      fullSpan: filter.fullSpan ?? false,
      halfSpan: filter.halfSpan ?? false,
      sockets: filter.sockets ?? false,
    },
  };
}

/**
 * GGG describes controls with a scatter of optional flags; collapse them into
 * one discriminator. `minMax` wins over options for the sole filter carrying
 * both (`price`, a min/max pair plus a currency dropdown) — its options survive
 * on the `options` field regardless. `toggle` is the fallback for a filter with
 * no flags at all, which GGG currently ships none of.
 */
function kindOf(filter: RawFilter): FilterKind {
  if (filter.minMax === true) return "range";
  if (filter.option?.knownItem !== undefined) return "lookup";
  if (filter.option?.options !== undefined) return "select";
  if (filter.input !== undefined) return "text";
  return "toggle";
}

function countByKind(filters: readonly Filter[]): FilterTotals["byKind"] {
  const counts = Object.fromEntries(FILTER_KINDS.map((kind) => [kind, 0])) as Record<
    FilterKind,
    number
  >;
  for (const filter of filters) counts[filter.kind]++;
  return counts;
}
