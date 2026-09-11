import type { Ledger } from "../../api/ledger/types.ts";
import type { Draft } from "../../api/taxonomy/types.ts";
import { applyChanges } from "./apply-changes.ts";

export const replayLedger = (base: Draft, ledger: Ledger): Draft =>
  ledger.reduce(
    (draft, { changes }) =>
      applyChanges(draft, { items: changes.items ?? {}, categories: changes.categories ?? {} }),
    base,
  );
