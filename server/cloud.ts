import { Redis } from "@upstash/redis";
import { randomUUID, createHash } from "node:crypto";
import { rankedConfig, verifyReplay } from "../src/game/ranking";
import { characters } from "../src/game/definitions";

export const SAVE_SCORE = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local run = cjson.decode(raw)
if run.used then return 0 end
run.used = true
redis.call('SET', KEYS[1], cjson.encode(run), 'EX', 3600)
for i = 2, 4, 2 do
  local old = redis.call('ZSCORE', KEYS[i], ARGV[1])
  if not old or tonumber(ARGV[2]) > tonumber(old) then
    redis.call('ZADD', KEYS[i], ARGV[2], ARGV[1])
    redis.call('HSET', KEYS[i+1], ARGV[1], ARGV[3])
  end
end
return 1`;
interface Run {
  player: string;
  name: string;
  character: string;
  day: string;
  issued: number;
  used?: boolean;
}
interface Entry {
  name: string;
  character: string;
  day: string;
  score: number;
  kills: number;
  blocks: number;
  won: number;
  duration: number;
}
let client: Redis | undefined;
function database() {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  )
    throw new Error("Leaderboard storage is not configured");
  return (client ??= new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  }));
}
function response(status: number, data: unknown) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
function namespace() {
  return (
    process.env.LEADERBOARD_NAMESPACE ||
    (process.env.VERCEL_ENV === "preview"
      ? `bombastic:v2:preview:${process.env.VERCEL_GIT_COMMIT_REF || "preview"}`
      : "bombastic:v2")
  );
}
export async function handleCloud(
  request: Request,
  operation: "health" | "leaderboard" | "start" | "finish",
  injected?: Redis,
) {
  try {
    const url = new URL(request.url),
      post = operation === "start" || operation === "finish";
    if (request.method !== (post ? "POST" : "GET"))
      return response(405, { error: "Method not allowed" });
    const redis = injected || database(),
      prefix = namespace(),
      day = new Date().toISOString().slice(0, 10);
    if (operation === "health") {
      await redis.ping();
      return response(200, {
        service: "bombastic-leaderboard",
        version: 2,
        storage: "redis",
      });
    }
    if (operation === "leaderboard") {
      const scope = url.searchParams.get("scope") === "all" ? "all" : day;
      const players = await redis.zrange<string[]>(
        `${prefix}:board:${scope}`,
        0,
        49,
        { rev: true },
      );
      const entries = players.length
        ? await Promise.all(
            players.map((player) =>
              redis.hget<Entry>(`${prefix}:entries:${scope}`, player),
            ),
          )
        : [];
      return response(200, {
        day,
        scope: scope === "all" ? "all" : "daily",
        entries: entries.filter(Boolean),
      });
    }
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin && origin !== process.env.PUBLIC_ORIGIN)
      return response(403, { error: "Origin not allowed" });
    const ip = (request.headers.get("x-forwarded-for") || "unknown")
      .split(",")[0]
      .trim();
    const hash = createHash("sha256").update(ip).digest("hex").slice(0, 24);
    const rateKey = `${prefix}:rate:${hash}:${Math.floor(Date.now() / 60000)}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 90);
    if (count > 12)
      return response(429, {
        error: "Too many requests. Try again in a minute.",
      });
    if (Number(request.headers.get("content-length") || 0) > 300000)
      return response(413, { error: "Request too large" });
    const text = await request.text();
    if (text.length > 300000)
      return response(413, { error: "Request too large" });
    const b = JSON.parse(text);
    if (operation === "start") {
      if (
        typeof b.player !== "string" ||
        !/^[a-zA-Z0-9-]{8,80}$/.test(b.player) ||
        typeof b.name !== "string" ||
        !characters.some((c) => c.id === b.character)
      )
        return response(400, {
          error: "Choose a valid player name and character",
        });
      const name = b.name
        .trim()
        .replace(/[^\p{L}\p{N} _.-]/gu, "")
        .slice(0, 20);
      if (name.length < 2)
        return response(400, { error: "Player name must be 2–20 characters" });
      const token = randomUUID();
      await redis.set(
        `${prefix}:run:${token}`,
        {
          player: b.player,
          name,
          character: b.character,
          day,
          issued: Date.now(),
        },
        { ex: 3600, nx: true },
      );
      return response(201, {
        token,
        config: rankedConfig(day),
        character: b.character,
      });
    }
    if (typeof b.token !== "string" || !/^[a-f0-9-]{36}$/.test(b.token))
      return response(400, { error: "Missing ranked session" });
    const runKey = `${prefix}:run:${b.token}`,
      run = await redis.get<Run>(runKey);
    if (!run || run.used || Date.now() - run.issued > 3600000)
      return response(409, {
        error: "This session was already submitted or expired",
      });
    if (
      !Array.isArray(b.replay) ||
      Date.now() - run.issued < (b.replay.length / 60) * 1000 - 2000
    )
      return response(400, { error: "Replay timing is invalid" });
    const result = verifyReplay(rankedConfig(run.day), run.character, b.replay);
    const entry: Entry = {
      name: run.name,
      character: run.character,
      day: run.day,
      ...result,
      won: Number(result.won),
    };
    const saved = await redis.eval<unknown[], number>(
      SAVE_SCORE,
      [
        runKey,
        `${prefix}:board:${run.day}`,
        `${prefix}:entries:${run.day}`,
        `${prefix}:board:all`,
        `${prefix}:entries:all`,
      ],
      [
        run.player,
        result.score * 1000000 + (121000 - result.duration),
        JSON.stringify(entry),
      ],
    );
    if (saved !== 1)
      return response(409, {
        error: "This session was already submitted or expired",
      });
    return response(201, { ...result, message: "Verified score saved" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message === "Leaderboard storage is not configured")
      return response(503, {
        error:
          "Leaderboard storage is not configured. Connect Upstash Redis in Vercel.",
      });
    if (/replay|Replay|Finish|JSON|Unexpected/.test(message))
      return response(400, { error: message });
    console.error(`Leaderboard ${operation} failed`); // Never log names, recordings or credentials.
    return response(503, {
      error: "Leaderboard temporarily unavailable. Please try again.",
    });
  }
}
