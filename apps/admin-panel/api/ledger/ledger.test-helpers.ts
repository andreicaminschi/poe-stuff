import type { DraftChanges } from "../taxonomy/types.ts";
import type { LedgerEntry } from "./types.ts";

export const entry = (seq: number, changes: DraftChanges = {}): LedgerEntry => ({
  seq,
  at: "2026-01-01T00:00:00Z",
  action: "save-items",
  changes,
});
