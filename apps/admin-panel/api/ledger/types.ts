import type { DraftChanges } from "../taxonomy/types.ts";

export type LedgerAction = "save-items" | "save-category" | "delete-category";

export type LedgerEntry = {
  readonly seq: number;
  readonly at: string;
  readonly action: LedgerAction;
  readonly changes: DraftChanges;
};

export type Ledger = readonly LedgerEntry[];
