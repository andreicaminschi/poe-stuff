import { ledgerArchiveKey, ledgerKey } from "../util/keys.ts";
import type { Lake } from "@poe/lake/types";
import { getLedger } from "./get.api.ts";
import type { Ledger } from "./types.ts";
import { saveDraft } from "../taxonomy/saveDraft.api.ts";
import type { DraftChanges } from "../taxonomy/types.ts";

const merged = (ledger: Ledger): DraftChanges =>
  ledger.reduce<DraftChanges>(
    (all, { changes }) => ({
      items: { ...all.items, ...changes.items },
      categories: { ...all.categories, ...changes.categories },
    }),
    {},
  );

export async function commitLedger(lake: Lake, id: string): Promise<void> {
  const ledger = await getLedger(lake, id);
  if (ledger.length === 0) return;

  await saveDraft(lake, id, merged(ledger));

  const archived = (await lake.exists(ledgerArchiveKey(id))) ? await lake.readJson<Ledger>(ledgerArchiveKey(id)) : [];
  await lake.writeJsonAtomic(ledgerArchiveKey(id), [...archived, ...ledger]);
  await lake.writeJsonAtomic(ledgerKey(id), []);
}
