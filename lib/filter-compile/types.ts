/** One authored condition. `from` reads the value off the row instead of `value`. */
export type Condition = {
  readonly condition: string;
  readonly operator?: string;
  readonly value?: string | number | boolean | readonly string[] | null;
  readonly from?: string;
};

export type Level = "category" | "subcategory" | "item" | "variant";

/** A condition that reached the item, where it came from, and the levels it overrode. */
export type ResolvedCondition = Condition & { readonly level: Level; readonly overrides?: readonly Level[] };

/** A condition a lower level removed: where it came from, and which level removed it. */
export type RemovedCondition = Condition & { readonly level: Level; readonly removedBy: Level };

/** One level's conditions, laid over the levels before it. */
export type Layer = { readonly level: Level; readonly conditions: readonly Condition[] };

/** What a `from` can read off a row. */
export type FromSource = { readonly name: string; readonly baseTypes: readonly string[] };
