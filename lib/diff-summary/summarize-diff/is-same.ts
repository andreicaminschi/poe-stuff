import diff from "microdiff";
import { isRecord } from "./is-record.ts";

/** Tells whether two state values hold the same content. */
export const isSame = (left: unknown, right: unknown): boolean => (isRecord(left) && isRecord(right)
  ? diff(left, right).length === 0
  : Object.is(left, right));
