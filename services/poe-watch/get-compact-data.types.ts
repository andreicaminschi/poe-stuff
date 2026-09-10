import type { AccessoryItem, ArmourItem, AzmeriItem, BaseTypeItem, CatalystItem, ChayulaItem, CurrencyItem, DeepwaterItem, DeliriumItem, DelveItem, DivinationCardItem, EssenceItem, FlaskItem, FragmentItem, GemItem, HeistItem, HeistMissionItem, HeistObjectiveItem, ItemisedCorpseItem, JewelItem, LegionItem, LogbookItem, MapItem, MonsterItem, OilItem, ResearchItem, RitualItem, SanctumItem, ScarabItem, StackedDeckItem, WeaponItem } from "./types.ts";

/** One item's market data. Narrow on `category` to reach the per-category fields. */
export type ItemData =
  | AccessoryItem
  | ArmourItem
  | AzmeriItem
  | BaseTypeItem
  | CatalystItem
  | ChayulaItem
  | CurrencyItem
  | DeepwaterItem
  | DeliriumItem
  | DelveItem
  | DivinationCardItem
  | EssenceItem
  | FlaskItem
  | FragmentItem
  | GemItem
  | HeistItem
  | HeistMissionItem
  | HeistObjectiveItem
  | ItemisedCorpseItem
  | JewelItem
  | LegionItem
  | LogbookItem
  | MapItem
  | MonsterItem
  | OilItem
  | ResearchItem
  | RitualItem
  | SanctumItem
  | ScarabItem
  | StackedDeckItem
  | WeaponItem;
