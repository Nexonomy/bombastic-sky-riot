# Game design

## Combat

The arena is an authoritative tile grid. Characters move one logical tile at a time, while the renderer interpolates the previous and current tile. Movement lasts 0.24 seconds divided by speed. Walls and crates block movement. The bomb owner can leave their freshly placed bomb, but cannot re-enter after leaving it. Active Ghost Step bypasses bombs and crates, never stone walls.

Blasts follow a cross and stop at walls. A normal blast destroys the first crate in its path and stops there. Piercing blasts continue through crates. Bombs reached by another blast detonate immediately and are removed before propagation, preventing duplicate chain events. A flame tracks actors it has already affected, and damage invulnerability prevents duplicate frame hits.

### Bombs

| Bomb | Behavior |
| --- | --- |
| Standard | 2.5-second fuse, ordinary cross; 1.7 seconds in Mayhem |
| Remote | F detonation, with a 12-second safety fuse |
| Piercing | Cross passes through destructible crates |
| Sticky | Tags an adjacent living rival at placement and follows its grid position; otherwise stays on the planted tile |
| Mega | Adds two range tiles, three-second fuse |
| Ice | Nonlethal two-second freeze |
| Fire | Lethal flames remain for three seconds |
| Shock | Nonlethal stun and ability silence |
| Cluster | Neighboring secondary bombs detonate after 0.6 seconds with range one |
| Mine | Arms after one second, triggers when a rival comes within one tile; 15-second safety fuse |
| Smoke | Nonlethal smoke hides rival name indicators on covered tiles; lethal flames and bombs remain visible |
| Wind | Nonlethal blast attempts a grid displacement away from its origin; collisions still apply |

All bomb types can participate in chain reactions. A nonlethal blast can therefore trigger a lethal bomb. Special pickups add to a persistent match arsenal; R cycles types. Standard, Ice, Cluster and Remote are available initially when special bombs are enabled.

### Pickups

Drop frequency is configured per match; core pickups have twice the weight of special bomb types. Capacity caps at six, blast range at six before temporary modifiers, and speed at 1.7. Shield absorbs one eligible hit. Kick makes a bomb roll until it hits an obstacle or an actor. Q picks up a bomb on the current or facing tile, including an opponent’s bomb. A second press throws it two tiles, or four with Throw, across obstacles and elevations. The fuse continues while carried. Life restores health in Survival/Boss and grants a shield in one-life modes. Mystery grants a core benefit. Curse reverses controls and reduces speed for five seconds.

## Characters

| Character | Speed | Active ability | Cooldown |
| --- | --- | --- | --- |
| Boomer | 1.00 | Quick Dash: up to two unobstructed tiles | 6 s |
| Spark | 1.12 | Speed Burst: +60% speed for four seconds | 10 s |
| Tanko | 0.90 | Shield Bubble: one shield charge | 12 s |
| Pixel | 1.00 | Blink: furthest valid tile up to three tiles ahead | 9 s |
| Fuse | 1.00 | Overcharge: two extra range tiles for five seconds | 10 s |
| Ghosty | 1.00 | Ghost Step: pass through bombs/crates for three seconds | 11 s |

All characters use the same core collision, bomb, damage, and pickup rules. Cosmetics never change statistics.

## Modes

Classic and Mayhem use last-player-standing rules. A defeated human can watch the remaining bots until the winner is confirmed. Simultaneous deaths produce a draw. Mayhem shortens ordinary bomb fuses.

Free-for-All respawns actors on safe tiles after two seconds. Five eliminations wins; when time expires, the highest score wins, with a draw for a tied lead.

Survival starts the human with three health points. Clearing a wave spawns the next opponents with increasing blast range; the fifth cleared wave wins. The player retains pickups and damage between waves. The round timer restarts each wave.

Boss starts the human with three health points and King Kaboom with ten. King Kaboom hunts across floor connections, telegraphs a charge for 0.9 seconds, and marks shockwave areas for 1.1 seconds. Later phases increase attack size/frequency and summon Fuseling minions. The boss is immune to its own attack flames. Defeating the boss ends the encounter even when minions remain.

Except in Free-for-All, the final 30 seconds activate sudden death. The unsafe boundary moves inward every seven seconds. The five-second initial warning, timer, and orange tiles indicate the transition. A final timeout prevents indefinite matches.

## Maps and hazards

Seeded generation builds permanent boundary walls and even-coordinate pillars, then clears corner spawn neighborhoods and connected perimeter avenues. It places crates only outside those corridors. This construction guarantees floor connectivity between all initial spawns even at maximum crate density. Structural connectivity is preserved as crates disappear.

Verdant Isles uses original swaying trees, saturated instanced turf, KUBIKOS stone/crates, animated rivers, waterfalls and fences. Candy uses chocolate obstacles and lollipop props; Midnight uses metal containers and city props; Frozen uses icy cargo and crystals; Lava uses barrels and warm crystals; Ruins uses mossy stone and trees; Orbital uses cargo, metal flooring, and antenna structures.

Marked Lava hazard tiles warm up between seconds four and six of an eight-second cycle and become damaging from seconds six to eight. AI includes the warm-up in its danger map. Ice tiles automatically continue movement along the actor's facing direction when the next tile is valid. Orbital teleport tiles cycle to the next valid generated pad, with a short arrival protection period. Other biomes are visual variants with the same base combat rules.

## AI

Bots compute danger using current walls/crates, remaining fuses, chain propagation, active flames, lava warnings, and the shrinking boundary. A* searches for escape tiles, useful pickups, rivals, or bombable crates. Candidate bomb placement is accepted only with a reachable escape outside its cross and a sufficient time margin. Four difficulties vary reaction delay and planting confidence. Aggressive, collector, trickster, and defensive personalities alter pursuit, pickup, chain, and planting priorities. No bot receives hidden speed or damage advantages.

## Progression

New saves receive 200 starter Boom Coins. A finished match awards `60 + kills×30 + destroyedCrates×2 + victory×120` XP and `30 + kills×15 + victory×70` coins. Each new achievement adds 25 coins. Level is `1 + floor(totalXP/400)`.

Repeatable challenges require three wins, five eliminations, or 30 destroyed crates per claim and award 75 coins plus 100 XP. Claims are validated against actual persistent counters. Purchases validate funds and ownership, deduct once, and equip the item. Versioned save recovery restores defaults for corrupted or missing data.

## Sky Riot layers and feedback

A map contains one to three non-overlapping terraces at 1.5-unit height intervals. Gold stair pairs connect them; height cliffs block walking. A* uses the same stair rules. Blasts stop at floor boundaries. Rivers slow wading to 72% speed and extinguish persistent fire; bridge tiles keep normal speed.

Quiet matches receive a safe supply drop about every 18 seconds after the first at 14 seconds. Eliminations within five seconds chain a visual combo. Damage flashes actors red for 0.65 seconds, shield absorption flashes cyan for 0.5 seconds; reduced motion uses steady tint. Shake, sparks and impact rings are presentation-only. Multi-floor matches begin with a shield per actor.

Ranked mode is a fixed Hard-bot Free-for-All on a shared daily seed. Server replay verification calculates points independently. Local hosting persists SQLite scores; Vercel hosting uses Upstash Redis and atomic session consumption.
