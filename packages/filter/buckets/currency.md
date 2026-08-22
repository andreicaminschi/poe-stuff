Currency - only has Pick as an action

Check ggg static and only account for 
Currency, Fragments, Ducats, EnshroudingCrystals, Keepers, AllflameEmbers, Runegrafts, Ancestor, Sanctum, Heist, Expedition, DeliriumOrbs, Catalysts, Oils, Delve, Essences, Beasts, MapKey, MapsSpecial, MapsUnique, Legacy, Misc


There is a list of max stacks available for each currency type in packages\filter\max-stacks.json
If the item is not present there assume stack is 1 but output it to a log when generating


T0  - Anything worth over 5 divines, no ceiling - for example, Mirrors, Hinekora Locks, etc
    - A stack of 5 divines is T0 in this case
    - C:WhiteAndRed(Circle, Large), Whoosh, XL
    - Beam:Red:Permanent
    - Persistent

T1  - Anything 70% + of a divine value in chaos - probably astrolabes, fracturing orbs, etc
    - C:WhiteAndRed(Circle, Medium), Whoosh, L
    - Beam:Red:Permanent
    - Persistent

T2  - Anthing 10% + of a divine value in chaos - probably sacred orbs
    - C:OrangeAndWhite(Circle, Medium), Zdrang, L
    - Beam:Orange:Permanent
    - Persistent

T3  - Anything 5% of a divine value in chaos - probably Anuuls, Ancients, etc
    - C:OrangeAndBlack(Circle,Small), Bonk, L
    - Beam:None
    - Persistent

T4  - The bread an butter of the entire thing, most common currency
    - The floor is the user input of min-floor value
    - C:OrangeAndYellow(Circle,Small), NoSound, L


Never hidden
    - Scarabs and Allflame Embers are persistent no matter what
    - The min-floor value can never hide them
    - This is NOT a promotion. They keep the tier their own price earns and the styling that
      tier gives them - a 1c scarab is still drawn as a 1c scarab, it is simply drawn
    - Configured in tiers.json under "neverHidden". Scarabs are matched by name because the
      exchange files 124 of them under Fragments and 2 under Currency; allflames have a
      group of their own

League start
    - On leaguestart you want to pick as many crafting mats as you can
    - The list is hardcoded for now - but if a currency from this list becomes eligible to move higher on tiers then it will be removed from this list
    - Not entirely sure if currency can be hidden based on area level (check neversink)

T5  - Alchemy, Orb of Regret, Orb of unmaking, Scourings, Vaals, Alteration
    - C:FlatYellow, S
    - If possible, always show them until level 68

T6  - Wisdoms, Portals, Regal
    - C:FlatNude, S
    - If possible, always show them until level 68
