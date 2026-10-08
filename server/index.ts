import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync, existsSync, createReadStream } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { rankedConfig, verifyReplay } from "../src/game/ranking";
import { characters } from "../src/game/definitions";

const data = resolve(process.env.DATA_DIR || "data");
mkdirSync(data, { recursive: true });
const db = new DatabaseSync(resolve(data, "rankings.sqlite"));
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,player TEXT NOT NULL,name TEXT NOT NULL,character TEXT NOT NULL,day TEXT NOT NULL,issued INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS scores(run TEXT PRIMARY KEY,player TEXT NOT NULL,name TEXT NOT NULL,character TEXT NOT NULL,day TEXT NOT NULL,score INTEGER NOT NULL,kills INTEGER NOT NULL,blocks INTEGER NOT NULL,won INTEGER NOT NULL,duration INTEGER NOT NULL,created INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS scores_rank ON scores(day,score DESC);`);
const root = resolve("dist");
const rates = new Map<string, { count: number; until: number }>();
setInterval(() => {
  for (const [k, v] of rates) if (v.until < Date.now()) rates.delete(k);
  db.prepare("DELETE FROM runs WHERE issued < ? AND used=0").run(
    Date.now() - 3600000,
  );
}, 60000).unref();
function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 300000) throw new Error("Request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      if (req.method === "POST") {
        const origin = req.headers.origin;
        const expected = process.env.PUBLIC_ORIGIN;
        if (
          origin &&
          origin !== (expected || `http://${req.headers.host}`) &&
          origin !== `https://${req.headers.host}` &&
          origin !== "http://localhost:5173"
        )
          return json(res, 403, { error: "Origin not allowed" });
        const ip = req.socket.remoteAddress || "unknown",
          now = Date.now();
        const rate = rates.get(ip);
        if (rate && rate.until > now && rate.count >= 12)
          return json(res, 429, {
            error: "Too many requests. Try again in a minute.",
          });
        rates.set(ip, {
          count: rate && rate.until > now ? rate.count + 1 : 1,
          until: rate && rate.until > now ? rate.until : now + 60000,
        });
      }
      if (url.pathname === "/api/health" && req.method === "GET")
        return json(res, 200, { service: "bombastic-leaderboard", version: 2 });
      if (url.pathname === "/api/leaderboard" && req.method === "GET") {
        const daily = url.searchParams.get("scope") !== "all",
          day = new Date().toISOString().slice(0, 10);
        // One best run per player; real records only, never fabricated rivals.
        const rows = db
          .prepare(
            `SELECT name,character,score,kills,blocks,won,duration,day FROM (SELECT *,ROW_NUMBER() OVER(PARTITION BY player ORDER BY score DESC,created ASC) rn FROM scores ${daily ? "WHERE day=?" : ""}) WHERE rn=1 ORDER BY score DESC,duration ASC LIMIT 50`,
          )
          .all(...(daily ? [day] : []));
        return json(res, 200, {
          day,
          scope: daily ? "daily" : "all",
          entries: rows,
        });
      }
      if (url.pathname === "/api/ranked/start" && req.method === "POST") {
        const b = await body(req),
          day = new Date().toISOString().slice(0, 10);
        if (
          typeof b.player !== "string" ||
          !/^[a-zA-Z0-9-]{8,80}$/.test(b.player) ||
          typeof b.name !== "string" ||
          !characters.some((c) => c.id === b.character)
        )
          return json(res, 400, {
            error: "Choose a valid player name and character",
          });
        const name = b.name
          .trim()
          .replace(/[^\p{L}\p{N} _.-]/gu, "")
          .slice(0, 20);
        if (name.length < 2)
          return json(res, 400, {
            error: "Player name must be 2–20 characters",
          });
        const token = randomUUID();
        db.prepare(
          "INSERT INTO runs(id,player,name,character,day,issued) VALUES(?,?,?,?,?,?)",
        ).run(token, b.player, name, b.character, day, Date.now());
        return json(res, 201, {
          token,
          config: rankedConfig(day),
          character: b.character,
        });
      }
      if (url.pathname === "/api/ranked/finish" && req.method === "POST") {
        const b = await body(req);
        if (typeof b.token !== "string")
          return json(res, 400, { error: "Missing ranked session" });
        const run = db.prepare("SELECT * FROM runs WHERE id=?").get(b.token) as
          | {
              player: string;
              name: string;
              character: string;
              day: string;
              issued: number;
              used: number;
            }
          | undefined;
        if (!run || run.used || Date.now() - run.issued > 3600000)
          return json(res, 409, {
            error: "This session was already submitted or expired",
          });
        if (
          !Array.isArray(b.replay) ||
          Date.now() - run.issued < (b.replay.length / 60) * 1000 - 2000
        )
          return json(res, 400, { error: "Replay timing is invalid" });
        const result = verifyReplay(
          rankedConfig(run.day),
          run.character,
          b.replay,
        );
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("INSERT INTO scores VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(
            b.token,
            run.player,
            run.name,
            run.character,
            run.day,
            result.score,
            result.kills,
            result.blocks,
            Number(result.won),
            result.duration,
            Date.now(),
          );
          db.prepare("UPDATE runs SET used=1 WHERE id=?").run(b.token);
          db.exec("COMMIT");
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
        return json(res, 201, { ...result, message: "Verified score saved" });
      }
      return json(res, 404, { error: "Endpoint not found" });
    }
    if (req.method !== "GET" && req.method !== "HEAD")
      return json(res, 405, { error: "Method not allowed" });
    let path = resolve(root, "." + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + sep))
      return json(res, 403, { error: "Invalid path" });
    if (!extname(path) || url.pathname === "/")
      path = resolve(root, "index.html");
    if (!existsSync(path)) return json(res, 404, { error: "File not found" });
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": path.includes(sep + "assets" + sep)
        ? "public,max-age=3600"
        : "no-cache",
    });
    if (req.method === "HEAD") res.end();
    else createReadStream(path).pipe(res);
  } catch (e) {
    json(res, 400, {
      error: e instanceof Error ? e.message : "Request failed",
    });
  }
});
server.listen(Number(process.env.PORT || 4174), "0.0.0.0", () =>
  console.log(
    `BOMBASTIC + shared leaderboard: http://localhost:${process.env.PORT || 4174}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
