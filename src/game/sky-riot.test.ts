import { describe, it, expect, vi } from "vitest";
vi.mock("./audio", () => ({ sound: vi.fn() }));
import { Game } from "./engine";
import { defaultConfig } from "./definitions";
import { rankedConfig, rankedScore, verifyReplay } from "./ranking";
import { key, astar } from "./grid";
function arena(mode: typeof defaultConfig.mode = "ffa") {
  const g = new Game({
    ...defaultConfig,
    mode,
    density: 0,
    hazards: false,
    bots: 1,
  });
  g.phase = "playing";
  for (const a of g.actors) {
    a.think = 1000;
    a.invulnerable = 0;
    a.shield = 0;
  }
  return g;
}
function advance(g: Game, n: number) {
  for (let i = 0; i < n * 60; i++) g.step(1 / 60);
}
describe("Sky Riot floors, water and carrying", () => {
  it("connects every spawn across all three floors for varied seeds and sizes", () => {
    for (const size of ["small", "medium", "large"] as const)
      for (let seed = 0; seed < 15; seed++) {
        const g = new Game({
          ...defaultConfig,
          size,
          density: 0.6,
          seed: String(seed),
        });
        expect(new Set(g.tiles.map((t) => t.level)).size).toBe(3);
        for (const other of g.actors.slice(1))
          expect(
            astar(
              key(g.player.x, g.player.z),
              (k) => k === key(other.x, other.z),
              (k) => g.neighbors(g.player, k),
            ).length,
          ).toBeGreaterThan(0);
      }
  });
  it("allows stairs and blocks walking through a terrace cliff", () => {
    const g = arena(),
      p = g.player;
    const stair = g.tiles.find(
      (t) => t.stair && g.tile(t.x, t.z + 1)?.level === t.level + 1,
    )!;
    p.x = stair.x;
    p.z = stair.z;
    expect(g.move(p, 2)).toBe(true);
    p.move = 0;
    p.x = stair.x + 2;
    p.z = stair.z;
    g.tile(p.x, p.z)!.kind = "floor";
    g.tile(p.x, p.z + 1)!.kind = "floor";
    expect(g.move(p, 2)).toBe(false);
  });
  it("stops explosions at the floor boundary even when a stair connects it", () => {
    const g = arena();
    const t = g.tiles.find(
      (t) => t.stair && g.tile(t.x, t.z + 1)?.level === t.level + 1,
    )!;
    expect(
      g.blastTiles({ x: t.x, z: t.z, range: 4, kind: "piercing" }),
    ).not.toContain(key(t.x, t.z + 1));
  });
  it("slows wading and gives wooden bridges normal walking speed", () => {
    const g = arena(),
      p = g.player;
    g.tile(2, 1)!.water = true;
    g.tile(2, 1)!.bridge = false;
    g.move(p, 1);
    const slow = p.moveTime;
    p.move = 0;
    p.x = 1;
    p.z = 1;
    g.tile(2, 1)!.bridge = true;
    g.move(p, 1);
    expect(slow).toBeGreaterThan(p.moveTime);
  });
  it("water extinguishes persistent fire", () => {
    const g = arena();
    g.tile(1, 1)!.water = true;
    g.tile(1, 1)!.bridge = false;
    g.place(g.player, "fire");
    g.detonate(g.bombs[0]);
    expect(g.flames.find((f) => f.x === 1 && f.z === 1)?.time).toBe(0.25);
  });
  it("carries an opponent's bomb, keeps its fuse ticking, and throws across floors", () => {
    const g = arena();
    g.player.throw = true;
    g.place(g.player);
    const b = g.bombs[0];
    b.owner = 1;
    g.secondary(g.player);
    expect(g.player.holding).toBe(b.id);
    expect(b.heldBy).toBe(0);
    advance(g, 0.3);
    expect(b.fuse).toBeLessThan(2.5);
    g.player.facing = 2;
    g.secondary(g.player);
    expect(b.z).toBe(5);
    expect(b.flight).toBeDefined();
    expect(b.heldBy).toBeUndefined();
    advance(g, 0.5);
    expect(b.flight).toBeUndefined();
  });
  it("detonates a carried bomb and releases the carrier", () => {
    const g = arena();
    g.place(g.player);
    const b = g.bombs[0];
    g.secondary(g.player);
    b.fuse = 0.01;
    g.step(1 / 60);
    g.step(1 / 60);
    expect(g.bombs).toHaveLength(0);
    expect(g.player.holding).toBeUndefined();
    expect(g.player.alive).toBe(false);
  });
  it("retains collected bomb types in the switchable arsenal", () => {
    const g = arena();
    g.pickup(g.player, { id: 888, x: 1, z: 1, kind: "mega" });
    expect(g.player.arsenal).toContain("mega");
    g.cycleBomb(g.player);
    expect(g.player.kind).toBe("standard");
    g.control(-1, (g.player.arsenal.indexOf("mega") + 1) << 5);
    expect(g.player.kind).toBe("mega");
  });
  it("delivers regular supplies during quiet matches", () => {
    const g = arena();
    g.eventTimer = 0.01;
    g.step(1 / 60);
    expect(g.pickups).toHaveLength(1);
    expect(g.message).toContain("SUPPLY DROP");
  });
});
describe("active boss and hit feedback", () => {
  it("hunts across stairs instead of remaining at its spawn", () => {
    const g = arena("boss"),
      boss = g.actors[1];
    const start = [boss.x, boss.z];
    g.player.hp = 100;
    g.player.invulnerable = 100;
    advance(g, 3);
    expect([boss.x, boss.z]).not.toEqual(start);
    expect(g.tiles.filter((t) => t.stair).length).toBeGreaterThan(0);
  });
  it("telegraphs a charge and spawns minions in phase two", () => {
    const g = arena("boss"),
      boss = g.actors[1];
    boss.hp = 5;
    g.bossTimer = 0.01;
    g.step(1 / 60);
    expect(g.bossAction).toBe("CHARGE WINDUP");
    expect(g.warnings.length).toBeGreaterThan(0);
    expect(g.actors.some((a) => a.name === "FUSELING")).toBe(true);
    advance(g, 1);
    expect(g.bossDash).toBeGreaterThan(0);
  });
  it("ends after the boss dies even with living minions", () => {
    const g = arena("boss");
    g.actors.push(g.createActor(2, 2, 1, "fuse"));
    g.actors[1].alive = false;
    g.step(1 / 60);
    expect(g.winner).toBe("YOU");
  });
  it("flashes all damaged actors red and clears feedback on a timer", () => {
    const g = arena();
    for (const a of g.actors) {
      a.hp = 3;
      g.damage(a, -1);
      expect(a.hitFlash).toBe(0.65);
    }
    advance(g, 0.7);
    expect(g.actors.every((a) => a.hitFlash === 0)).toBe(true);
  });
  it("uses a separate shield flash and does not flash on ignored hits", () => {
    const g = arena();
    g.player.shield = 1;
    g.damage(g.player, 1);
    expect(g.player.shieldFlash).toBe(0.5);
    expect(g.player.hitFlash).toBe(0);
    g.damage(g.player, 1);
    expect(g.player.hitFlash).toBe(0);
  });
});
describe("verified ranking", () => {
  it("replays a completed match and calculates scores independently", () => {
    const config = rankedConfig("2026-10-08"),
      g = new Game(config);
    g.phase = "playing";
    g.rankedToken = "test";
    for (
      let frame = 0;
      frame < 7260 && String(g.phase) !== "finished";
      frame++
    ) {
      g.control(Math.floor(frame / 42) % 4, frame % 130 === 0 ? 1 : 0);
      g.step(1 / 60);
    }
    const result = verifyReplay(config, "boomer", g.replay);
    expect(result.score).toBe(rankedScore(g));
    expect(result.kills).toBe(g.stats.kills);
    expect(() =>
      verifyReplay(config, "boomer", [...g.replay, [-1, 0]]),
    ).toThrow("continues");
  });
  it("rejects unfinished, oversized and invalid input recordings", () => {
    const config = rankedConfig("2026-10-08");
    expect(() => verifyReplay(config, "boomer", [[-1, 0]])).toThrow("Finish");
    expect(() => verifyReplay(config, "boomer", [[99, 0]])).toThrow("input");
    expect(() =>
      verifyReplay(config, "boomer", new Array(8000).fill([-1, 0])),
    ).toThrow("length");
  });
});
