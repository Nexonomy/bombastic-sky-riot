import { it, expect, vi } from "vitest";
import type { Redis } from "@upstash/redis";
import { handleCloud, SAVE_SCORE } from "./cloud";
import { Game } from "../src/game/engine";
import { rankedScore } from "../src/game/ranking";

it("fails cleanly without cloud credentials and rejects cross-origin writes", async () => {
  const missing = await handleCloud(
    new Request("https://game.test/api/health"),
    "health",
  );
  expect(missing.status).toBe(503);
  const redis = {} as Redis;
  const bad = await handleCloud(
    new Request("https://game.test/api/ranked/start", {
      method: "POST",
      headers: { origin: "https://other.test" },
      body: "{}",
    }),
    "start",
    redis,
  );
  expect(bad.status).toBe(403);
});
it("uses expiring server sessions and atomic Redis writes after verifying a complete replay", async () => {
  const store = new Map<string, unknown>();
  const evalMock = vi.fn().mockResolvedValue(1);
  const set = vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
    return "OK";
  });
  const fake = {
    set,
    get: vi.fn(async (key: string) => store.get(key)),
    incr: vi.fn(async () => 1),
    expire: vi.fn(),
    eval: evalMock,
  } as unknown as Redis;
  const req = (path: string, body: unknown) =>
    new Request(`https://game.test/api/${path}`, {
      method: "POST",
      headers: {
        origin: "https://game.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  const started = await handleCloud(
    req("ranked/start", {
      player: "cloud-player-test",
      name: "CLOUD QA",
      character: "boomer",
    }),
    "start",
    fake,
  );
  expect(started.status).toBe(201);
  const run = await started.json();
  expect(set.mock.calls[0][0]).toContain(":run:");
  expect(set).toHaveBeenCalledWith(expect.any(String), expect.any(Object), {
    ex: 3600,
    nx: true,
  });
  const game = new Game(run.config);
  game.phase = "playing";
  game.rankedToken = run.token;
  for (
    let frame = 0;
    frame < 7260 && String(game.phase) !== "finished";
    frame++
  ) {
    game.control(Math.floor(frame / 42) % 4, frame % 130 === 0 ? 1 : 0);
    game.step(1 / 60);
  }
  const stored = store.get(set.mock.calls[0][0]) as { issued: number };
  stored.issued = Date.now() - (game.replay.length / 60) * 1000;
  const result = await handleCloud(
    req("ranked/finish", {
      token: run.token,
      replay: game.replay,
      score: 999999,
    }),
    "finish",
    fake,
  );
  expect(result.status).toBe(201);
  expect((await result.json()).score).toBe(rankedScore(game));
  expect(evalMock).toHaveBeenCalledOnce();
  const [script, keys, args] = evalMock.mock.calls[0];
  expect(script).toBe(SAVE_SCORE);
  expect(keys).toHaveLength(5);
  expect(keys[0]).toContain(run.token);
  expect(JSON.parse(args[2]).name).toBe("CLOUD QA");
  expect(JSON.parse(args[2]).score).not.toBe(999999);
});
