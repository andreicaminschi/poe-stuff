/** Named sets of condition values, so a command and a summary can say `non-unique` instead of listing values. */
export const VALUE_SETS: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  Rarity: {
    "non-unique": ["Normal", "Magic", "Rare"],
    "magic-or-better": ["Magic", "Rare", "Unique"],
  },
  HasInfluence: {
    conqueror: ["Crusader", "Hunter", "Redeemer", "Warlord"],
    "shaper-elder": ["Shaper", "Elder"],
    any: ["Shaper", "Elder", "Crusader", "Hunter", "Redeemer", "Warlord"],
  },
  ItemLevel: {
    "usual-breakpoints": ["1-49", "50-67", "68-74", "75-83", "84-100"],
    leveling: ["1-67"],
    endgame: ["68-100"],
    "max-tier": ["86-100"],
  },
  Quality: {
    quality: ["1-30"],
    "high-quality": ["20-30"],
  },
  LinkedSockets: {
    "five-link": ["5-5"],
    "six-link": ["6-6"],
  },
  AreaLevel: {
    leveling: ["1-67"],
    maps: ["68-100"],
  },
  MapTier: {
    "white-maps": ["1-5"],
    "yellow-maps": ["6-10"],
    "red-maps": ["11-17"],
  },
};
