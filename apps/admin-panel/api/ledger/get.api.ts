import { ledgerKey } from "../util/keys.ts";
import type { Lake } from "@poe/lake/types";
import type { Ledger } from "./types.ts";
import { readOr } from "../util/read-or.ts";

export const getLedger = (lake: Lake, id: string): Promise<Ledger> => readOr<Ledger>(lake, ledgerKey(id), []);
