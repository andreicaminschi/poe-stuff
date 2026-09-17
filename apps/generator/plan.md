In the generator app create a script that splits the items from a certain category from the catalog into buckets

A bucket is a grouping of items from a category that share a common set of rules
A bucket can have multiple sub buckets
- the item price is in a certain interval
- the item potential price is in a certain interval 
-- this applies applies to uniques for example, where a Heavy Belt unique has a base price of like 1c, but a potential price of 30000c
-- or, later on, when influence items get per mod pricing, a frenzy on hit body armor goes from 1c to probably 200c
-- essentially, this is just the user does something and the price might go up if he's lucky
- the item potential price when corrupted increases it by a certain multiplier - eg. corrupting certain uniques can significantly increase their price based on the corruption outcome
-- this is a special case of the previous sub bucket, technically only applies to uniques, but can also apply to some bases,


So, a bucket is defined by
- the floor cost
- the ceiling cost - items that are more expensive than this goes in a higher tier bucket
- the subbuckets with their evaluator functions
-- these are hardcoded for now
-- calling them Take, Check and Gamble

Take - the min price is between the floor and ceiling
Check - the highest price for that is between the floor and ceiling
Gamble - the expected price for that corrupted version of that item is between floor and ceiling

Examples
|Bucket name|Price min/max|gamble|
|-|-|-
|T5|1-15c|yes|
|T3|15-30c|yes|
|T2|30-40c|no|
|T1|40-50c|no|
|T0|50c-anything|no|

Gamble column means that an item from that bucket can be gambled or not. The decision refers to the bucket floor

|Item|Price (min/max)|Result|Reasoning|
|-|-|-|-|
|Agate amulet|3c/3c|T5 take|min above the floor|
|Simplex amulet|60c/60c|T0 take|min above the floor|
|Heavy belt - unique|1c/80c|T0 check|min is t5, but aspirational is T0|
|Auxium (rarity corruption)|base 1c, corruption 25c|T3 gamble|the base is cheap, the right corruption meets T3 min|
|Heavy belt - Mageblood (movement speed corruption)|base 1c, corruption 999c|T0 check|T0 is not gamble enabled, the filter cannot detect that the item is mageblood so it considers the Heavy Belt aspirational value|

So, write a function that takes a bucket list as a parameter, and an item list
and returns the bucketed items, with reasons why they are there
