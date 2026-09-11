import { ledgerKey } from "../util/keys.ts";
import type { Lake } from "@poe/lake/types";
import type { Ledger } from "./types.ts";

export async function getLedger(lake: Lake, id: string): Promise<Ledger> {
  return (await lake.exists(ledgerKey(id))) ? await lake.readJson<Ledger>(ledgerKey(id)) : [];
}
