import { defaultConfig, type MatchConfig } from "./definitions";
import { Game } from "./engine";

export function rankedConfig(day: string): MatchConfig {
  return {
    ...defaultConfig,
    mode: "ffa",
    difficulty: "hard",
    size: "small",
    duration: 120,
    bots: 3,
    seed: `SKY-RIOT-${day}`,
    floors: 3,
    water: true,
    density: 0.3,
  };
}
export function rankedScore(game: Game) {
  return (
    (game.winner === "YOU" ? 1000 : 0) +
    game.stats.kills * 150 +
    game.stats.blocks * 10 +
    game.stats.pickups * 15 +
    (game.winner === "YOU" ? Math.floor(Math.max(0, 120 - game.time) * 2) : 0)
  );
}
export function verifyReplay(
  config: MatchConfig,
  character: string,
  replay: unknown,
) {
  if (!Array.isArray(replay) || replay.length < 1 || replay.length > 60 * 121)
    throw new Error("Invalid replay length");
  const game = new Game(config, character);
  game.phase = "playing";
  for (const frame of replay) {
    if (
      !Array.isArray(frame) ||
      frame.length !== 2 ||
      !Number.isInteger(frame[0]) ||
      frame[0] < -1 ||
      frame[0] > 3 ||
      !Number.isInteger(frame[1]) ||
      frame[1] < 0 ||
      frame[1] > 415
    )
      throw new Error("Invalid replay input");
    if (String(game.phase) === "finished")
      throw new Error("Replay continues after finish");
    game.control(frame[0], frame[1]);
    game.step(1 / 60);
  }
  if (String(game.phase) !== "finished")
    throw new Error("Finish the ranked match before submitting");
  return {
    score: rankedScore(game),
    kills: game.stats.kills,
    blocks: game.stats.blocks,
    won: game.winner === "YOU",
    duration: Math.round(game.totalTime * 1000),
  };
}
