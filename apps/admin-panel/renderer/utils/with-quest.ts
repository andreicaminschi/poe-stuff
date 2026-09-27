import type { Item } from "../../api/taxonomy/types.ts";
import { withTrueFlag } from "./with-true-flag.ts";

export const withQuest = (item: Item, quest: boolean): Item => withTrueFlag(item, "quest", quest);
