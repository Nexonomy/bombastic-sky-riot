import type { MatchConfig } from "./definitions";
export interface Tile {
  x: number;
  z: number;
  kind: "floor" | "wall" | "crate";
  hazard: boolean;
  drop: number;
  level: number;
  stair: boolean;
  water: boolean;
  bridge: boolean;
}
export const key = (x: number, z: number) => `${x},${z}`;
export const directions = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
export function random(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function dimensions(config: MatchConfig) {
  return config.size === "small"
    ? [11, 11]
    : config.size === "medium"
      ? [15, 13]
      : config.size === "large"
        ? [19, 15]
        : [
            Math.max(9, Math.min(21, config.width | 1)),
            Math.max(9, Math.min(17, config.height | 1)),
          ];
}
export function generate(config: MatchConfig) {
  const [width, height] = dimensions(config);
  const rng = random(config.seed);
  const spawns = [
    [1, 1],
    [width - 2, height - 2],
    [width - 2, 1],
    [1, height - 2],
  ];
  const tiles: Tile[] = [];
  const floors = Math.max(1, Math.min(3, config.floors ?? 1));
  const tier = (z: number) =>
    Math.min(
      floors - 1,
      Math.floor((Math.max(0, z - 1) * floors) / (height - 2)),
    );
  for (let z = 0; z < height; z++)
    for (let x = 0; x < width; x++) {
      const edge = x === 0 || z === 0 || x === width - 1 || z === height - 1;
      const wall = edge || (x % 2 === 0 && z % 2 === 0);
      const safe = spawns.some(
        ([sx, sz]) => Math.abs(x - sx) + Math.abs(z - sz) <= 2,
      ); // Open central avenues connect all spawn regions.
      const avenue = x === 1 || z === 1 || x === width - 2 || z === height - 2;
      const crate = !wall && !safe && !avenue && rng() < config.density;
      tiles.push({
        x,
        z,
        kind: wall ? "wall" : crate ? "crate" : "floor",
        hazard: !wall && !crate && !safe && config.hazards && rng() < 0.07,
        drop: rng(),
        level: tier(z),
        stair: false,
        water: false,
        bridge: false,
      });
    }
  // Each terrace has stairs at both sides and across the central avenue.
  // Stair routes are cleared so all spawns can reach every floor.
  for (let z = 1; z < height - 2; z++) {
    if (tier(z) === tier(z + 1)) continue;
    for (const x of [1, width - 2, Math.floor(width / 2) | 1]) {
      for (const zz of [z, z + 1]) {
        const tile = tiles[zz * width + x];
        tile.kind = "floor";
        tile.hazard = false;
        tile.stair = true;
      }
    }
  }
  if (config.water) {
    for (const t of tiles) {
      if (t.x === 3 && t.z > 1 && t.z < height - 2 && !t.stair) {
        t.kind = "floor";
        t.hazard = false;
        t.water = true;
        t.bridge = t.z % 3 === 1;
      }
    }
  }
  return { width, height, tiles, spawns };
}
export function astar(
  start: string,
  goal: (k: string) => boolean,
  neighbors: (k: string) => string[],
  cost: (k: string) => number = () => 1,
  heuristic: (k: string) => number = () => 0,
): string[] {
  const open = [start],
    g = new Map([[start, 0]]),
    from = new Map<string, string>();
  const visited = new Set<string>();
  for (let steps = 0; open.length && steps < 500; steps++) {
    open.sort((a, b) => g.get(a)! + heuristic(a) - (g.get(b)! + heuristic(b)));
    const cur = open.shift()!;
    if (goal(cur)) {
      const path = [cur];
      while (from.has(path[0])) path.unshift(from.get(path[0])!);
      return path.slice(1);
    }
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const n of neighbors(cur)) {
      const score = g.get(cur)! + cost(n);
      if (score < (g.get(n) ?? Infinity)) {
        g.set(n, score);
        from.set(n, cur);
        open.push(n);
      }
    }
  }
  return [];
}
