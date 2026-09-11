import { ledgerKey } from "../util/keys.ts";
import type { Lake } from "@poe/lake/types";
import { getLedger } from "./get.api.ts";
import { assertEditable } from "../util/assert-editable.ts";

export async function popLedger(lake: Lake, id: string, seq: number): Promise<void> {
  await assertEditable(lake, id);

  const ledger = await getLedger(lake, id);
  const last = ledger.at(-1);

  if (last?.seq !== seq) {
    throw new Error(`The ledger for ${id} ends at ${String(last?.seq ?? "nothing")}, not ${seq}. Reload the panel.`);
  }

  await lake.writeJsonAtomic(ledgerKey(id), ledger.slice(0, -1));
}
