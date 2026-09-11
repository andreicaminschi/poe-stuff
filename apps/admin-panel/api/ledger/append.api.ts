import { ledgerKey } from "../util/keys.ts";
import type { Lake } from "@poe/lake/types";
import { getLedger } from "./get.api.ts";
import type { LedgerEntry } from "./types.ts";
import { assertEditable } from "../util/assert-editable.ts";

export async function appendLedger(lake: Lake, id: string, entry: LedgerEntry): Promise<void> {
  await assertEditable(lake, id);

  const ledger = await getLedger(lake, id);
  const expected = (ledger.at(-1)?.seq ?? 0) + 1;

  if (entry.seq !== expected) {
    throw new Error(`The ledger for ${id} expected entry ${expected}, got ${entry.seq}. Reload the panel.`);
  }

  await lake.writeJsonAtomic(ledgerKey(id), [...ledger, entry]);
}
