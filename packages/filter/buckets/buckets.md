All the prices for all tiers are expressed in chaos
On filterblade, i noticed Neversink has a checkbox for sound called "drop"
Says
> When enabled, the item will keep the default sound effect (such as a metallic noise for weapons or a high pitch "pling" for orbs). 
> An item can have both the default sound and a filter-alert sound.
Down bellow i will specify this effect with "Drop"


A lower tier currency can move up on tiers depending on the user configuration
For example, let's say the configured Poverty high tier has Orb of Alchemy but the price of Alchemies shoots up and it can become a T4 currency - in this case it can move up

In the other direction, there can be conflicts on min-pickup value configured by the user and the actual tier values
So, for example, on leaguestart divines are about 60c and the user configured (by mistake) a ground pickup value of 5c - this means that T3 items dissapear 5% of 60c is 3c
To solve this, each tier now has a new property - persistent
A persistent tier can never be hidden by any ground-floor-value rule
The below tiers will be moved to a json, i want the Persistent to be configurable there

So, we have two rules that would solve out problems
- currencies can move up the tiers - the highest tier determines the visual
- each tier is configurable to be persistent or not

Templates used bellow
Anything in () is configurable


C:WhiteAndRed               Text:Red Border:Red BG:White Icon:Red:(Circle:Large)
C:OrangeAndWhite            Text:White Border:Black BG:Orange Icon:Orange:(Circle:Medium)
C:OrangeAndBlack            Text:Black Border:Black BG:Black Icon:Yellow:(Circle:Small)
C:OrangeAndYellow           Text:Black Border:Black BG:Yellow Icon:White:(Circle:Small)
C:FlatYellow                Text:Black BG:Yellow
C:FlatNude                  Text:Black BG:Nude

U:WhiteAndBrown             Text:Brown Border:Brown BG:White Icon:Red:(Star:Large)
U:BrownAndWhite             Text:White Border:White BG:Brown Icon:Brown:(Star:Medium)
U:BrownAndWhite:Gamble      Text:rgb(226, 150, 150) Border:Red BG:rgb(175, 60, 37)
U:BrownAndBrown             Text:rgb(175, 96, 37) Border:rgb(175, 96, 37) BG:rgb(53, 13, 13) Icon:Brown:(Star:Small)
U:BrownAndBrown:Gamble      Text:red Border:red BG:rgb(53, 13, 13)
U:BrownAndBlack             Text:Black Border:Black BG:Brown
U:BrownAndBlack:Gamble      Text:Black Border:Red BG:rgb(175, 60, 37)

Bases:CyanAndWhite          Text:White Border:Cyan BG:Cyan Icon:Cyan:(Diamond:Large)
Bases:CyanAndWhite:NoIcon   Text:White Border:Cyan BG:Cyan                 

Gems:CyanAndBlack           Text:Black Border:Cyan BG:Cyan Icon:Cyan:(Triangle:Large)
Gems:CyanAndBlack:NoIcon    Text:Black Border:Cyan BG:Cyan                 


maps:Normal                 Text:Black Border:Black BG:White Icon:Red:(Square:Small)
maps:Unique                 Text:White Border:Brown BG:Brown Icon:Red:(Square:Large)
maps:Tink                   Text:Black Border:Black BG:White Icon:Red:(Square:Purple)

Whoosh                      Sound:6:300:Drop
Zdrang                      Sound:1:300:Drop
Bonk                        Sound:2:300:Drop
Unique                      Sound:3:300:Drop

XL                          Size:45
L                           Size:35
S                           Size:26
XS                          Size:18


Check marker
Gold is the colour code of Check. A Check keeps the styling of the tier it is on and lays
this over the top. Configured in tiers.json under "check", so every value is editable
without touching code.

Check:Border                rgb(255, 190, 0)
Check:BG                    the tier's own BG, mixed 20% toward rgb(255, 190, 0)
Check:Text                  Black or White, whichever reads on that BG
Check:Size                  L
Check:Icon                  Yellow:(Star:Small) - only if the item's OWN tier drew an icon
Check:Beam                  Yellow - taken from the ASPIRATIONAL tier, only if it has one

Recolour, never invent. A Check turns gold what the ladder already spent and adds nothing.
The icon follows the tier the item is; the beam follows the tier it could be, because a beam
is the only mark drawn out in the world and that is a question about upside.

The background is a TINT, not a colour. Each tier's own background is mixed a fifth of the
way toward the gold, so a T0 Check still reads as T0 and a T4 Check as T4 - the gold says
there may be more here, which is a question about that tier and says nothing if every tier
answers it in the same rectangle. A fifth is a suggestion rather than a repaint: the border
is the mark that has to be seen, and the background only has to agree with it. The text is not configured at all: it is black or white, whichever reads
on the blend that comes out.

The sound is never changed by a Check.


