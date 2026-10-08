import { describe, expect, it, vi } from "vitest";
vi.mock("./audio", () => ({
  sound: vi.fn(),
  initAudio: vi.fn(),
  audioSettings: {},
}));
import { Game, type Bomb } from "./engine";
import { defaultConfig, characters } from "./definitions";
import { astar, generate, key } from "./grid";
import { freshSave, loadSave, useStore } from "../store";
function clean(mode: typeof defaultConfig.mode = "classic") {
  const g = new Game(
    {
      ...defaultConfig,
      mode,
      bots: 1,
      hazards: false,
      density: 0,
      floors: 1,
      water: false,
    },
    "boomer",
  );
  g.phase = "playing";
  g.actors.forEach((a) => {
    a.invulnerable = 0;
    a.think = 1000;
  });
  return g;
}
function bomb(
  g: Game,
  x: number,
  z: number,
  kind: Bomb["kind"] = "standard",
  range = 2,
  owner = 0,
) {
  const b: Bomb = {
    id: g.id++,
    x,
    z,
    kind,
    range,
    owner,
    fuse: 2.5,
    age: 0,
    pass: true,
    tick: 0,
  };
  g.bombs.push(b);
  return b;
}
function advance(g: Game, s: number) {
  for (let i = 0; i < Math.ceil(s * 60); i++) g.step(1 / 60);
}
describe("procedural generation", () => {
  it("recreates the entire logical arena from a seed", () => {
    expect(generate(defaultConfig)).toEqual(generate(defaultConfig));
  });
  it("changes layout when the seed changes", () => {
    expect(generate(defaultConfig).tiles).not.toEqual(
      generate({ ...defaultConfig, seed: "new-seed" }).tiles,
    );
  });
  it.each([
    ["small", 11, 11],
    ["medium", 15, 13],
    ["large", 19, 15],
  ] as const)("uses %s dimensions", (size, w, h) => {
    const a = generate({ ...defaultConfig, size });
    expect([a.width, a.height, a.tiles.length]).toEqual([w, h, w * h]);
  });
  it("validates odd custom dimensions and clamps extremes", () => {
    const a = generate({
      ...defaultConfig,
      size: "custom",
      width: 80,
      height: 2,
    });
    expect([a.width, a.height]).toEqual([21, 9]);
  });
  it("guarantees safe, connected spawn regions for 80 seeds", () => {
    for (let i = 0; i < 80; i++) {
      const a = generate({ ...defaultConfig, seed: String(i), density: 0.7 });
      const grid = new Map(a.tiles.map((t) => [key(t.x, t.z), t]));
      for (const [x, z] of a.spawns) {
        expect(grid.get(key(x, z))?.kind).toBe("floor");
        expect(
          grid.get(key(x + 1 < a.width - 1 ? x + 1 : x - 1, z))?.kind,
        ).toBe("floor");
        const goal = key(...(a.spawns[0] as [number, number]));
        const start = key(x, z);
        if (start === goal) continue;
        const path = astar(
          start,
          (k) => k === goal,
          (k) => {
            const [nx, nz] = k.split(",").map(Number);
            return [
              [nx + 1, nz],
              [nx - 1, nz],
              [nx, nz + 1],
              [nx, nz - 1],
            ]
              .map(([px, pz]) => key(px, pz))
              .filter((v) => grid.get(v)?.kind === "floor");
          },
        );
        expect(path.length).toBeGreaterThan(0);
      }
    }
  });
});
describe("movement and collision", () => {
  it("rejects walls, out of bounds and crates", () => {
    const g = clean(),
      a = g.player;
    expect(g.move(a, 3)).toBe(false);
    g.tile(2, 1)!.kind = "crate";
    expect(g.move(a, 1)).toBe(false);
    expect(g.walkable(a, -1, 1)).toBe(false);
    expect(g.walkable(a, 99, 1)).toBe(false);
  });
  it("moves exactly one tile and rejects a second move while interpolating", () => {
    const g = clean(),
      a = g.player;
    expect(g.move(a, 1)).toBe(true);
    expect([a.x, a.z]).toEqual([2, 1]);
    expect(g.move(a, 1)).toBe(false);
    advance(g, 0.25);
    expect(a.move).toBe(0);
    expect(g.move(a, 1)).toBe(true);
  });
  it("applies speed boosts to travel time", () => {
    const g = clean();
    g.player.speed = 1.5;
    g.move(g.player, 1);
    expect(g.player.moveTime).toBeCloseTo(0.16);
  });
  it("permits ghost traversal during the ability, then restores collision", () => {
    const g = clean();
    g.player.character = "ghosty";
    g.tile(2, 1)!.kind = "crate";
    g.ability(g.player);
    expect(g.move(g.player, 1)).toBe(true);
    advance(g, 3.1);
    g.player.x = 1;
    g.player.z = 1;
    expect(g.move(g.player, 1)).toBe(false);
  });
});
describe("bomb correctness", () => {
  it("enforces capacity and unique placement", () => {
    const g = clean();
    g.player.capacity = 1;
    expect(g.place(g.player)).toBe(true);
    expect(g.place(g.player)).toBe(false);
    g.move(g.player, 1);
    advance(g, 0.25);
    expect(g.place(g.player)).toBe(false);
  });
  it("lets the owner leave, then blocks re-entry", () => {
    const g = clean();
    g.place(g.player);
    expect(g.walkable(g.player, 1, 1)).toBe(true);
    g.move(g.player, 1);
    advance(g, 0.25);
    expect(g.bombs[0].pass).toBe(false);
    expect(g.move(g.player, 3)).toBe(false);
  });
  it("blocks other actors from entering a fresh owner bomb", () => {
    const g = clean();
    g.place(g.player);
    expect(g.walkable(g.actors[1], 1, 1)).toBe(false);
  });
  it("detonates at the fuse duration and returns capacity", () => {
    const g = clean();
    g.place(g.player);
    g.player.invulnerable = 5;
    advance(g, 2.4);
    expect(g.bombs.length).toBe(1);
    advance(g, 0.2);
    expect(g.bombs.length).toBe(0);
    expect(g.flames.length).toBeGreaterThan(0);
  });
  it("stops propagation at a wall and at the first wooden crate", () => {
    const g = clean();
    g.tile(3, 1)!.kind = "crate";
    const blast = g.blastTiles({ x: 1, z: 1, range: 5, kind: "standard" });
    expect(blast).toContain("3,1");
    expect(blast).not.toContain("4,1");
    expect(blast).not.toContain("0,1");
  });
  it("pierces crates and destroys them using the same logical cross", () => {
    const g = clean();
    g.tile(3, 1)!.kind = "crate";
    const b = bomb(g, 1, 1, "piercing", 4);
    g.detonate(b);
    expect(g.tile(3, 1)!.kind).toBe("floor");
    expect(g.flames.some((f) => f.x === 5 && f.z === 1)).toBe(true);
  });
  it("triggers chains exactly once without leaving detonated bombs", () => {
    const g = clean();
    const b = bomb(g, 1, 1);
    bomb(g, 3, 1);
    g.detonate(b);
    expect(g.bombs).toHaveLength(0);
    expect(g.stats.chains).toBe(1);
    expect(new Set(g.flames.map((f) => f.id)).size).toBe(g.flames.length);
  });
  it("does not award chain progress for bot-only explosions", () => {
    const g = clean();
    const b = bomb(g, 1, 1, "standard", 2, 1);
    bomb(g, 3, 1, "standard", 2, 1);
    g.detonate(b);
    expect(g.stats.chains).toBe(0);
  });
  it("propagates chain timing into the danger map", () => {
    const g = clean();
    const a = bomb(g, 1, 1);
    a.fuse = 0.1;
    bomb(g, 3, 1, "standard", 2);
    expect(g.dangerMap().get("5,1")).toBe(0.1);
  });
  it("manually detonates owned remote bombs", () => {
    const g = clean();
    g.player.kind = "remote";
    g.place(g.player);
    advance(g, 0.5);
    expect(g.bombs.length).toBe(1);
    g.remote(g.player);
    expect(g.bombs.length).toBe(0);
  });
  it("attaches a sticky bomb to an adjacent opponent and follows their tile", () => {
    const g = clean();
    const a = g.actors[1];
    a.x = 2;
    a.z = 1;
    g.player.kind = "sticky";
    g.place(g.player);
    expect(g.bombs[0].target).toBe(1);
    a.x = 3;
    g.step(1 / 60);
    expect(g.bombs[0].x).toBe(3);
  });
  it("smoke does not damage characters or wooden crates", () => {
    const g = clean();
    g.tile(3, 1)!.kind = "crate";
    g.detonate(bomb(g, 1, 1, "smoke", 3));
    g.step(1 / 60);
    expect(g.player.hp).toBe(1);
    expect(g.tile(3, 1)!.kind).toBe("crate");
  });
  it("wind displaces fighters while keeping the blast nonlethal", () => {
    const g = clean();
    g.player.x = 3;
    g.player.z = 1;
    g.player.fromX = 3;
    g.player.fromZ = 1;
    g.detonate(bomb(g, 2, 1, "wind", 2, 1));
    g.step(1 / 60);
    expect(g.player.x).toBe(4);
    expect(g.player.alive).toBe(true);
  });
  it("fire persists for three seconds", () => {
    const g = clean();
    g.detonate(bomb(g, 3, 3, "fire", 1));
    expect(g.flames.every((f) => f.time === 3)).toBe(true);
  });
  it("mine bombs react to nearby opponents only after arming", () => {
    const g = clean();
    const b = bomb(g, 1, 1, "mine");
    g.actors[1].x = 2;
    g.actors[1].z = 1;
    advance(g, 0.8);
    expect(g.bombs).toContain(b);
    advance(g, 0.3);
    expect(g.bombs).not.toContain(b);
  });
  it("cluster bombs produce delayed secondary blasts", () => {
    const g = clean();
    g.detonate(bomb(g, 3, 3, "cluster"));
    expect(g.bombs.length).toBe(4);
    expect(g.bombs.every((b) => b.range === 1 && b.fuse === 0.6)).toBe(true);
  });
  it("kicks a bomb onto a valid adjacent floor tile", () => {
    const g = clean();
    g.player.kick = true;
    bomb(g, 2, 1);
    g.move(g.player, 1);
    expect(g.bombs[0].x).toBe(3);
  });
  it("rolls kicked bombs until the next obstacle", () => {
    const g = clean();
    g.player.kick = true;
    bomb(g, 2, 1);
    g.tile(6, 1)!.kind = "crate";
    g.move(g.player, 1);
    advance(g, 0.6);
    expect(g.bombs[0].x).toBe(5);
    expect(g.bombs[0].velocity).toBeUndefined();
  });
  it("throws an adjacent bomb over intervening obstacles", () => {
    const g = clean();
    g.player.throw = true;
    g.player.facing = 1;
    bomb(g, 1, 1);
    g.tile(2, 1)!.kind = "crate";
    g.secondary(g.player);
    expect(g.player.holding).toBe(g.bombs[0].id);
    g.secondary(g.player);
    expect(g.bombs[0].x).toBe(5);
    expect(g.bombs[0].flight).toBeDefined();
  });
  it("flags warming lava before damage activation", () => {
    const g = clean();
    g.config.biome = "lava";
    g.tile(3, 3)!.hazard = true;
    g.time = 4.5;
    expect(g.hazardActive(g.tile(3, 3)!)).toBe(false);
    expect(g.dangerMap().get("3,3")).toBe(1.5);
  });
});
describe("combat, modes and lifecycle", () => {
  it("consumes a shield once and provides invulnerability", () => {
    const g = clean();
    g.player.shield = 1;
    g.damage(g.player, 1);
    expect(g.player.shield).toBe(0);
    expect(g.player.alive).toBe(true);
    g.damage(g.player, 1);
    expect(g.player.alive).toBe(true);
  });
  it("resolves simultaneous elimination as a draw", () => {
    const g = clean();
    g.actors[1].x = 3;
    g.actors[1].z = 1;
    g.detonate(bomb(g, 1, 1, "standard", 3));
    g.step(1 / 60);
    expect(g.winner).toBe("DRAW");
  });
  it("confirms a winner before finishing", () => {
    const g = clean();
    g.damage(g.actors[1], 0);
    g.step(1 / 60);
    expect(g.winner).toBe("YOU");
    expect(g.stats.kills).toBe(1);
  });
  it("keeps remaining bots playing after the human is eliminated", () => {
    const g = new Game({ ...defaultConfig, bots: 3 });
    g.phase = "playing";
    g.player.invulnerable = 0;
    g.damage(g.player, 1);
    g.step(1 / 60);
    expect(g.phase).toBe("playing");
    expect(g.winner).toBe("");
  });
  it("pauses all timers and returns to the previous lifecycle phase", () => {
    const g = clean();
    g.place(g.player);
    g.pause();
    advance(g, 3);
    expect(g.time).toBe(0);
    expect(g.bombs[0].fuse).toBe(2.5);
    g.pause();
    expect(g.phase).toBe("playing");
  });
  it("respawns a defeated player in free-for-all", () => {
    const g = clean("ffa");
    g.damage(g.player, 1);
    advance(g, 2.1);
    expect(g.player.alive).toBe(true);
    expect(g.actors[1].score).toBe(1);
  });
  it("wins free-for-all at five actual eliminations", () => {
    const g = clean("ffa");
    g.player.score = 5;
    g.step(1 / 60);
    expect(g.winner).toBe("YOU");
  });
  it("advances survival waves and only wins after the fifth", () => {
    const g = clean("survival");
    g.actors[1].hp = 1;
    g.damage(g.actors[1], 0);
    advance(g, 1.6);
    expect(g.wave).toBe(2);
    expect(g.phase).toBe("playing");
    g.wave = 5;
    g.actors[1].invulnerable = 0;
    g.damage(g.actors[1], 0);
    g.step(1 / 60);
    expect(g.winner).toBe("YOU");
  });
  it("ends a boss encounter after ten damage points", () => {
    const g = clean("boss");
    const boss = g.actors[1];
    for (let i = 0; i < 10; i++) {
      boss.invulnerable = 0;
      g.damage(boss, 0);
    }
    g.step(1 / 60);
    expect(g.winner).toBe("YOU");
  });
  it("shrinks the arena on a predictable schedule", () => {
    const g = clean();
    g.time = g.config.duration - 29;
    g.step(1 / 60);
    expect(g.shrink).toBe(1);
    expect(g.unsafe(1, 1)).toBe(true);
    expect(g.unsafe(5, 5)).toBe(false);
  });
  it("starts with an input-locked countdown", () => {
    const g = new Game(defaultConfig);
    expect(g.move(g.player, 1)).toBe(false);
    expect(g.place(g.player)).toBe(false);
    advance(g, 3.1);
    expect(g.phase).toBe("playing");
  });
  it("runs each character ability with enforced cooldowns", () => {
    for (const c of characters) {
      const g = clean();
      g.player.character = c.id;
      g.player.facing = 1;
      expect(g.ability(g.player)).toBe(true);
      expect(g.player.cooldown).toBe(c.ability.cooldown);
      expect(g.ability(g.player)).toBe(false);
    }
  });
  it("applies nonlethal ice and shock effects", () => {
    for (const kind of ["ice", "shock"] as const) {
      const g = clean();
      g.detonate(bomb(g, 1, 1, kind));
      g.step(1 / 60);
      expect(g.player.alive).toBe(true);
      expect(g.player.stun).toBeGreaterThan(0);
    }
  });
});
describe("AI decisions", () => {
  it("plans a valid escape from a candidate cross blast", () => {
    const g = clean();
    const a = g.actors[1];
    a.x = 3;
    a.z = 3;
    const b = bomb(g, 3, 3);
    const path = g.escape(a, g.dangerMap());
    expect(path.length).toBeGreaterThan(0);
    expect(g.blastTiles(b)).not.toContain(path.at(-1));
  });
  it("moves off an imminent danger tile", () => {
    const g = clean();
    const a = g.actors[1];
    a.x = 3;
    a.z = 3;
    bomb(g, 3, 3).fuse = 1;
    g.bot(a);
    expect([a.x, a.z]).not.toEqual([3, 3]);
  });
  it("does not plant a bomb when there is no escape route", () => {
    const g = clean();
    const a = g.actors[1];
    a.x = 3;
    a.z = 3;
    for (const [x, z] of [
      [2, 3],
      [4, 3],
      [3, 2],
      [3, 4],
    ])
      g.tile(x, z)!.kind = "crate";
    g.bot(a);
    expect(g.bombs.length).toBe(0);
  });
  it("finds pickups around dynamic obstacles", () => {
    const g = clean();
    const a = g.actors[1];
    a.x = 1;
    a.z = 1;
    g.pickups.push({ id: 9, x: 3, z: 3, kind: "range" });
    g.bot(a);
    expect(a.move).toBeGreaterThan(0);
    expect(g.tile(a.x, a.z)!.kind).toBe("floor");
  });
  it("completes bot-only matches without stalls over multiple seeds and difficulties", () => {
    for (const difficulty of ["easy", "normal", "hard", "insane"] as const) {
      for (let seed = 0; seed < 3; seed++) {
        const g = new Game({
          ...defaultConfig,
          difficulty,
          seed: String(seed),
          duration: 45,
        });
        g.phase = "playing";
        for (let tick = 0; tick < 65 * 60 && g.phase === "playing"; tick++) {
          if (tick % 12 === 0 && g.player.move === 0) g.bot(g.player);
          g.step(1 / 60);
        }
        expect(g.phase).toBe("finished");
        expect(g.bombs.length).toBeLessThan(30);
      }
    }
  });
});
describe("persistence and economy", () => {
  it("allows repeatable challenge claims only at actual progress milestones", () => {
    useStore.setState({ save: { ...freshSave(), kills: 5 } });
    useStore.getState().claimChallenge("kills");
    expect(useStore.getState().save.coins).toBe(275);
    expect(useStore.getState().save.challengeClaims.kills).toBe(1);
    useStore.getState().claimChallenge("kills");
    expect(useStore.getState().save.coins).toBe(275);
    useStore.getState().updateSave({ kills: 10 });
    useStore.getState().claimChallenge("kills");
    expect(useStore.getState().save.challengeClaims.kills).toBe(2);
  });
  it("recovers corrupt, missing and incompatible save data", () => {
    expect(loadSave("{broken")).toEqual(freshSave());
    expect(loadSave(null)).toEqual(freshSave());
    expect(loadSave('{"version":9}')).toEqual(freshSave());
  });
  it("preserves owned cosmetics and restores missing settings", () => {
    const save = loadSave(
      JSON.stringify({
        version: 1,
        coins: 123,
        owned: ["crown"],
        hat: "crown",
        character: "pixel",
        settings: { music: 0.4 },
      }),
    );
    expect(save.coins).toBe(123);
    expect(save.hat).toBe("crown");
    expect(save.settings.bindings.bomb).toBe("Space");
    expect(save.settings.music).toBe(0.4);
  });
  it("rejects invalid identifiers and negative currency", () => {
    const save = loadSave(
      JSON.stringify({
        version: 1,
        coins: -5,
        owned: ["fake"],
        hat: "fake",
        character: "fake",
        color: "bad",
      }),
    );
    expect(save.coins).toBe(0);
    expect(save.owned).toEqual([]);
    expect(save.hat).toBe("none");
    expect(save.character).toBe("boomer");
    expect(save.color).toBe("#ed5646");
  });
  it("validates funds and prevents duplicate purchases", () => {
    useStore.setState({ save: freshSave() });
    expect(useStore.getState().purchase("crown")).toBe(true);
    expect(useStore.getState().save.coins).toBe(40);
    expect(useStore.getState().save.hat).toBe("crown");
    expect(useStore.getState().purchase("crown")).toBe(false);
    expect(useStore.getState().purchase("metal")).toBe(false);
    expect(useStore.getState().save.coins).toBe(40);
  });
  it("grants result rewards once and tracks actual achievements", () => {
    useStore.setState({ save: freshSave(), config: { ...defaultConfig } });
    useStore.getState().start();
    const game = useStore.getState().game;
    game.stats.bombs = 1;
    game.finish("YOU");
    const save = useStore.getState().save;
    expect(save.matches).toBe(1);
    expect(save.achievements).toContain("first-blast");
    expect(save.achievements).not.toContain("f");
    expect(save.achievements).not.toContain("first-blood");
    game.finish("YOU");
    expect(useStore.getState().save.coins).toBe(save.coins);
  });
});
