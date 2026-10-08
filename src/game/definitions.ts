export type BombKind =
  | "standard"
  | "remote"
  | "piercing"
  | "sticky"
  | "mega"
  | "ice"
  | "fire"
  | "shock"
  | "cluster"
  | "mine"
  | "smoke"
  | "wind";
export type Mode = "classic" | "ffa" | "survival" | "mayhem" | "boss";
export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  duration: number;
  icon: string;
  targetType: string;
  behaviorId: string;
}
export interface CharacterDefinition {
  id: string;
  name: string;
  color: string;
  accent: string;
  ability: AbilityDefinition;
  speed: number;
  tag: string;
  description: string;
}
const ability = (
  id: string,
  name: string,
  description: string,
  cooldown: number,
  duration = 0,
): AbilityDefinition => ({
  id,
  name,
  description,
  cooldown,
  duration,
  icon: id,
  targetType: "self",
  behaviorId: id,
});
export const characters: CharacterDefinition[] = [
  {
    id: "boomer",
    name: "BOOMER",
    color: "#ed5646",
    accent: "#ffc564",
    speed: 1,
    tag: "THE ALL-ROUNDER",
    description: "A little fearless. A lot explosive.",
    ability: ability(
      "dash",
      "Quick dash",
      "Burst two tiles in your facing direction.",
      6,
    ),
  },
  {
    id: "spark",
    name: "SPARK",
    color: "#e5b631",
    accent: "#fff0b5",
    speed: 1.12,
    tag: "THE SPEEDSTER",
    description: "Catch her if you can.",
    ability: ability(
      "speed",
      "Speed burst",
      "Move 60% faster for four seconds.",
      10,
      4,
    ),
  },
  {
    id: "tanko",
    name: "TANKO",
    color: "#648ba7",
    accent: "#b3dcf2",
    speed: 0.9,
    tag: "THE GUARDIAN",
    description: "Built like a bunker. Hits like a bomb.",
    ability: ability(
      "shield",
      "Shield bubble",
      "Absorb the next explosion.",
      12,
    ),
  },
  {
    id: "pixel",
    name: "PIXEL",
    color: "#bc83d6",
    accent: "#edd6ff",
    speed: 1,
    tag: "THE TRICKSTER",
    description: "Already three steps ahead.",
    ability: ability(
      "teleport",
      "Blink",
      "Teleport three tiles ahead, to a valid tile.",
      9,
    ),
  },
  {
    id: "fuse",
    name: "FUSE",
    color: "#e68335",
    accent: "#ffdf87",
    speed: 1,
    tag: "THE DEMOLITIONIST",
    description: "Subtlety was never the plan.",
    ability: ability(
      "amplify",
      "Overcharge",
      "Add two blast tiles for five seconds.",
      10,
      5,
    ),
  },
  {
    id: "ghosty",
    name: "GHOSTY",
    color: "#74bbaa",
    accent: "#d3fff0",
    speed: 1,
    tag: "THE ESCAPE ARTIST",
    description: "Here one second. Gone the next.",
    ability: ability(
      "ghost",
      "Ghost step",
      "Pass through bombs and crates for three seconds.",
      11,
      3,
    ),
  },
];
export const biomes = [
  {
    id: "meadow",
    name: "Verdant Isles",
    tag: "THE GRASS IS ALWAYS GREENER",
    floor: "#68c957",
    side: "#80522d",
    wall: "#61869c",
    sky: "#153b72",
    accent: "#c9ef53",
    prop: "tree",
  },
  {
    id: "candy",
    name: "Candy Kingdom",
    tag: "SWEET WITH A SIDE OF CHAOS",
    floor: "#f079ba",
    side: "#8a447e",
    wall: "#b1cad4",
    sky: "#61329f",
    accent: "#fff0b6",
    prop: "candy",
  },
  {
    id: "neon",
    name: "Midnight District",
    tag: "LIGHT UP THE NIGHT",
    floor: "#354577",
    side: "#303644",
    wall: "#82929f",
    sky: "#313e58",
    accent: "#36ffe5",
    prop: "city",
  },
  {
    id: "ice",
    name: "Frozen Fortress",
    tag: "KEEP YOUR COOL",
    floor: "#79d3f1",
    side: "#648fa0",
    wall: "#8eb5d2",
    sky: "#9cb7ca",
    accent: "#e2ffff",
    prop: "ice",
  },
  {
    id: "lava",
    name: "Lava Foundry",
    tag: "TURN UP THE HEAT",
    floor: "#566480",
    side: "#514c49",
    wall: "#9a9486",
    sky: "#b19a89",
    accent: "#ffb75d",
    prop: "lava",
  },
  {
    id: "ruins",
    name: "Ancient Ruins",
    tag: "HISTORY GOES BOOM",
    floor: "#40b98c",
    side: "#625c4b",
    wall: "#b3ad8a",
    sky: "#a0b0a4",
    accent: "#d8c69c",
    prop: "ruins",
  },
  {
    id: "space",
    name: "Orbital Outpost",
    tag: "ZERO GRAVITY. MAXIMUM IMPACT.",
    floor: "#6581ba",
    side: "#45515f",
    wall: "#b7c6d4",
    sky: "#58677f",
    accent: "#9af1e4",
    prop: "space",
  },
];
export const bombKinds: BombKind[] = [
  "standard",
  "remote",
  "piercing",
  "sticky",
  "mega",
  "ice",
  "fire",
  "shock",
  "cluster",
  "mine",
  "smoke",
  "wind",
];
export const bombDescriptions: Record<BombKind, string> = {
  standard: "Cross blast · 2.5s fuse",
  remote: "F to detonate · 12s safety fuse",
  piercing: "Cuts through wooden crates",
  sticky: "Tags an adjacent opponent and follows them",
  mega: "Two extra blast tiles · longer fuse",
  ice: "Freezes rivals for 2 seconds",
  fire: "Leaves flames for 3 seconds",
  shock: "Stuns and silences abilities",
  cluster: "Delayed explosions on neighboring tiles",
  mine: "Arms in 1s · triggers on enemy approach",
  smoke: "Nonlethal smoke conceals tactical indicators",
  wind: "Nonlethal gust pushes fighters away",
};
export const modes: { id: Mode; name: string; description: string }[] = [
  {
    id: "classic",
    name: "Classic battle",
    description: "One life. Last bomber standing.",
  },
  {
    id: "ffa",
    name: "Free-for-all",
    description: "Respawn and race to five eliminations.",
  },
  {
    id: "survival",
    name: "Survival",
    description: "Clear five escalating waves.",
  },
  {
    id: "mayhem",
    name: "Bomb mayhem",
    description: "Short fuses. Big blasts. Beautiful chaos.",
  },
  {
    id: "boss",
    name: "King Kaboom",
    description: "Defeat a royal menace with three phases.",
  },
];
export interface MatchConfig {
  mode: Mode;
  biome: string;
  seed: string;
  size: "small" | "medium" | "large" | "custom";
  width: number;
  height: number;
  difficulty: "easy" | "normal" | "hard" | "insane";
  bots: number;
  duration: number;
  density: number;
  drops: number;
  hazards: boolean;
  specialBombs: boolean;
  abilities: boolean;
  capacity: number;
  range: number;
  floors: number;
  water: boolean;
}
export const defaultConfig: MatchConfig = {
  mode: "classic",
  biome: "meadow",
  seed: "KUBIKOS-1987",
  size: "small",
  width: 13,
  height: 11,
  difficulty: "normal",
  bots: 3,
  duration: 120,
  density: 0.38,
  drops: 0.5,
  hazards: true,
  specialBombs: true,
  abilities: true,
  capacity: 2,
  range: 2,
  floors: 3,
  water: true,
};
export type PickupKind =
  | "capacity"
  | "range"
  | "speed"
  | "shield"
  | "kick"
  | "throw"
  | "life"
  | "mystery"
  | "curse"
  | BombKind;
export const pickupIcons: Partial<Record<PickupKind, string>> = {
  capacity: "+",
  range: "↔",
  speed: "»",
  shield: "◇",
  kick: "↗",
  throw: "↑",
  life: "♥",
  mystery: "?",
  curse: "!",
  remote: "◎",
  piercing: "⇥",
  mega: "✹",
  ice: "❄",
  fire: "♨",
  shock: "ϟ",
  cluster: "✣",
  mine: "⊙",
  smoke: "☁",
  wind: "≋",
  sticky: "⌁",
};
export const cosmetics = [
  {
    id: "crown",
    name: "Crowning glory",
    category: "headwear",
    price: 160,
    description: "A very explosive royal appointment.",
  },
  {
    id: "headphones",
    name: "Off the record",
    category: "headwear",
    price: 100,
    description: "Find your own rhythm.",
  },
  {
    id: "scarf",
    name: "Red rebellion",
    category: "outfit",
    price: 80,
    description: "A little attitude goes a long way.",
  },
  {
    id: "metal",
    name: "Chrome dome",
    category: "bomb",
    price: 120,
    description: "A polished finish for an unpolished plan.",
  },
  {
    id: "trail",
    name: "Star runner",
    category: "effect",
    price: 140,
    description: "Leave a little sparkle behind.",
  },
];
