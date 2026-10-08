import { it, expect } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Game } from "../src/game/engine";
import { rankedScore } from "../src/game/ranking";

it("shares real scores across clients, persists a restart, verifies the replay and rejects reuse", async () => {
  const parent = resolve("artifacts");
  mkdirSync(parent, { recursive: true });
  const data = mkdtempSync(resolve(parent, "leaderboard-test-")),
    port = "4181";
  let child: ChildProcess | undefined;
  const start = () =>
    new Promise<void>((yes, no) => {
      child = spawn(process.execPath, ["server-dist/index.mjs"], {
        env: { ...process.env, PORT: port, DATA_DIR: data },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.on("error", no);
      child.on("exit", (code) => {
        if (code) no(new Error(`Server exited ${code}`));
      });
      child.stdout?.on("data", (chunk) => {
        if (String(chunk).includes("shared leaderboard")) yes();
      });
    });
  const stop = () =>
    new Promise<void>((yes) => {
      if (!child || child.exitCode !== null) return yes();
      child.once("exit", () => yes());
      child.kill();
    });
  const request = async (path: string, body?: unknown) => {
    const response = await fetch(`http://localhost:${port}${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    await start();
    const run = await request("/api/ranked/start", {
      player: "integration-player-01",
      name: "QA PLAYER",
      character: "boomer",
    });
    expect(run.status).toBe(201);
    const g = new Game(run.data.config, "boomer");
    g.phase = "playing";
    g.rankedToken = run.data.token;
    for (
      let frame = 0;
      frame < 7260 && String(g.phase) !== "finished";
      frame++
    ) {
      g.control(Math.floor(frame / 42) % 4, frame % 130 === 0 ? 1 : 0);
      g.step(1 / 60);
    }
    const db = new DatabaseSync(resolve(data, "rankings.sqlite"));
    // Only this isolated test DB is backdated so the timing guard can be tested without waiting two minutes.
    db.prepare("UPDATE runs SET issued=? WHERE id=?").run(
      Date.now() - (g.replay.length / 60) * 1000,
      run.data.token,
    );
    db.close();
    const submitted = await request("/api/ranked/finish", {
      token: run.data.token,
      replay: g.replay,
      score: 999999,
    });
    expect(submitted.status).toBe(201);
    expect(submitted.data.score).toBe(rankedScore(g));
    expect((await request("/api/leaderboard")).data.entries[0].name).toBe(
      "QA PLAYER",
    );
    expect(
      (
        await request("/api/ranked/finish", {
          token: run.data.token,
          replay: g.replay,
        })
      ).status,
    ).toBe(409);
    await stop();
    await start();
    expect(
      (await request("/api/leaderboard?scope=all")).data.entries[0].score,
    ).toBe(rankedScore(g));
    expect(
      (
        await request("/api/ranked/start", {
          player: "bad",
          name: "x",
          character: "invalid",
        })
      ).status,
    ).toBe(400);
  } finally {
    await stop();
    if (data.startsWith(parent + sep) && data.includes("leaderboard-test-"))
      rmSync(data, { recursive: true, force: true });
  }
}, 20000);
