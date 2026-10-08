import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Bomb,
  Zap,
  Coins,
  Trophy,
  Users,
  Flame,
  Play,
  RotateCcw,
} from "lucide-react";
import { useStore } from "../store";
import {
  biomes,
  characters,
  modes,
  bombDescriptions,
} from "../game/definitions";
import { formatTime, keyLabel, achievements } from "./common";
import { RankedSubmission } from "./Leaderboard";
export default function Match() {
  const { game, save, start, setScreen, reward } = useStore();
  const p = game.player,
    c = characters.find((v) => v.id === p.character)!;
  const [scoreboard, setScoreboard] = useState(false),
    [fps, setFps] = useState(60);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
        if (e.code === "Tab") setScoreboard(true);
      },
      up = (e: KeyboardEvent) => {
        if (e.code === "Tab") setScoreboard(false);
      };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  useEffect(() => {
    if (!save.settings.fps) return;
    let id = 0,
      n = 0,
      last = performance.now();
    const tick = (now: number) => {
      n++;
      if (now - last >= 1000) {
        setFps(n);
        n = 0;
        last = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [save.settings.fps]);
  const cooldown = Math.ceil(p.cooldown);
  const tutorial = game.config.seed === "FIRST-BLAST";
  const goals = [
    ["Move with WASD", game.stats.steps > 2],
    ["Place a bomb · SPACE", game.stats.bombs > 0],
    ["Destroy a wooden crate", game.stats.blocks > 0],
    ["Collect a power-up", game.stats.pickups > 0],
    ["Use your ability · E", game.stats.abilities > 0],
    ["Defeat your rival", game.stats.kills > 0],
  ] as const;
  const currentGoal = goals.find((g) => !g[1]);
  return (
    <main className="match-ui">
      <div className="match-top">
        <div className="match-mode">
          <span className="eyebrow">
            {game.config.mode === "survival"
              ? `WAVE ${game.wave} / 5`
              : "LIVE FROM " +
                (biomes.find((b) => b.id === game.config.biome)?.name ??
                  "THE ARENA")}
          </span>
          <b>
            {modes.find((m) => m.id === game.config.mode)!.name.toUpperCase()}
          </b>
        </div>
        <div className={"match-timer " + (game.shrink ? "urgent" : "")}>
          <span>{game.shrink ? "SUDDEN DEATH" : "TIME REMAINING"}</span>
          <b>{formatTime(game.config.duration - game.time)}</b>
        </div>
        <div className="alive-counter">
          <Users size={20} />
          <b>
            {game.actors.filter((a) => a.alive).length}
            <small> / {game.actors.length}</small>
          </b>
          <span>IN THE GAME</span>
        </div>
        <button
          className="pause-button"
          onClick={() => {
            game.pause();
            useStore.getState().refresh();
          }}
        >
          Ⅱ <span>PAUSE / ESC</span>
        </button>
      </div>
      <div className="match-roster">
        {game.actors.map((a) => (
          <div className={a.alive ? "" : "eliminated"} key={a.id}>
            <i
              style={{
                background: characters.find((v) => v.id === a.character)!.color,
              }}
            />
            <b>{a.id === 0 ? "YOU" : a.name}</b>
            <span>
              {a.alive
                ? game.config.mode === "ffa"
                  ? a.score + " KOs"
                  : a.hp > 1
                    ? "♥".repeat(a.hp)
                    : "IN PLAY"
                : "OUT"}
            </span>
          </div>
        ))}
      </div>
      {game.config.mode === "boss" && (
        <div className="boss-bar">
          <span>KING KABOOM</span>
          <small>
            {game.bossAction} · PHASE{" "}
            {game.actors[1].hp > 6 ? 1 : game.actors[1].hp > 3 ? 2 : 3}
          </small>
          <div>
            <i style={{ width: `${game.actors[1].hp * 10}%` }} />
          </div>
        </div>
      )}
      {game.messageTime > 0 && game.phase === "playing" && (
        <div className="match-announcement">{game.message}</div>
      )}
      {game.config.floors > 1 && (
        <div className="floor-indicator">
          <b>F{(game.tile(p.x, p.z)?.level ?? 0) + 1}</b>
          <span>
            {game.config.floors} CONNECTED FLOORS
            <small>GOLD STAIRS CONNECT EACH LEVEL</small>
          </span>
        </div>
      )}
      {game.comboTime > 0 && game.combo > 1 && (
        <div className="combo-callout">{game.combo}× COMBO!</div>
      )}
      <div className="arsenal-bar">
        <span>
          YOUR ARSENAL <kbd>{keyLabel(save.settings.bindings.cycle)}</kbd>
        </span>
        {p.arsenal.map((kind) => (
          <button
            key={kind}
            className={kind === p.kind ? "active" : ""}
            onClick={() => {
              if (game.phase === "playing" && p.alive) {
                const index = p.arsenal.indexOf(kind);
                const current = p.arsenal.indexOf(p.kind);
                if (index !== current) {
                  game.pendingActions =
                    (game.pendingActions & 31) | ((index + 1) << 5);
                }
              }
            }}
            title={bombDescriptions[kind]}
          >
            {kind.toUpperCase()}
          </button>
        ))}
        <button
          onClick={() => (game.pendingActions |= 4)}
          disabled={game.phase !== "playing" || !p.alive}
        >
          <kbd>{keyLabel(save.settings.bindings.secondary)}</kbd>{" "}
          {p.holding !== undefined ? "THROW BOMB!" : "PICK UP / THROW"}
        </button>
        <button
          onClick={() => (game.pendingActions |= 16)}
          disabled={game.phase !== "playing" || !p.alive}
        >
          <kbd>{keyLabel(save.settings.bindings.remote)}</kbd> DETONATE
        </button>
      </div>
      {!p.alive && game.phase === "playing" && game.config.mode !== "ffa" && (
        <div className="spectating">
          YOU’RE OUT. WATCH THE LAST BOMBERS SETTLE IT.
        </div>
      )}
      {tutorial && game.phase === "playing" && (
        <div className="tutorial-objective">
          <small>FIRST BLAST / {goals.filter((v) => v[1]).length} OF 6</small>
          <b>{currentGoal?.[0] ?? "You’ve got this. Finish the fight!"}</b>
        </div>
      )}
      {game.time > game.config.duration - 35 &&
        game.time < game.config.duration - 30 && (
          <div className="sudden-warning">
            ⚠ SUDDEN DEATH IN {Math.ceil(game.config.duration - 30 - game.time)}
            <small>OUTER TILES WILL BURN. MOVE INWARD.</small>
          </div>
        )}
      <div className="match-bottom">
        <div className="player-hud">
          <span className="hud-avatar" style={{ background: save.color }}>
            <Bomb size={27} />
          </span>
          <div>
            <small>{c.tag}</small>
            <b>{c.name}</b>
            <span>
              {p.shield > 0
                ? "◇ SHIELD ACTIVE"
                : p.curse > 0
                  ? "! CURSED CONTROLS"
                  : p.stun > 0
                    ? "FROZEN / STUNNED"
                    : p.effect > 0
                      ? "ABILITY ACTIVE"
                      : "MAKE EVERY MOVE COUNT"}
            </span>
          </div>
        </div>
        <div className="hud-stat">
          <Bomb />
          <b>
            {Math.max(
              0,
              p.capacity - game.bombs.filter((b) => b.owner === 0).length,
            )}
            <small> / {p.capacity}</small>
          </b>
          <span>
            BOMBS <kbd>{keyLabel(save.settings.bindings.bomb)}</kbd>
          </span>
        </div>
        <div className="hud-stat">
          <Flame />
          <b>{p.range}</b>
          <span>BLAST RANGE</span>
        </div>
        <div className="hud-bomb-kind">
          <small>{p.kind.toUpperCase()} BOMB</small>
          <span>
            {p.kind === "standard" && game.config.mode === "mayhem"
              ? "Cross blast · 1.7s fuse"
              : bombDescriptions[p.kind]}
          </span>
          {p.kick && <b>↗ KICK</b>}
          {p.holding !== undefined && <b>⚠ FUSE STILL TICKING</b>}
        </div>
        <button
          className={"ability-hud " + (cooldown ? "cooling" : "")}
          style={
            {
              "--fill": `${100 - (p.cooldown / c.ability.cooldown) * 100}%`,
            } as React.CSSProperties
          }
          onClick={() => {
            game.pendingActions |= 2;
            useStore.getState().refresh();
          }}
          disabled={!p.alive || cooldown > 0 || !game.config.abilities}
        >
          <Zap size={24} />
          <span>
            <small>{cooldown ? `READY IN ${cooldown}s` : "READY TO GO"}</small>
            <b>{c.ability.name}</b>
          </span>
          <kbd>{keyLabel(save.settings.bindings.ability)}</kbd>
        </button>
      </div>
      <div className="match-seed">
        SEED / {game.config.seed}{" "}
        <span>{save.settings.fps ? `${fps} FPS` : "TAB / SCOREBOARD"}</span>
      </div>
      {game.phase === "intro" && (
        <div className="countdown">
          <span>GET READY TO MAKE SOME NOISE</span>
          <b>{Math.ceil(game.intro)}</b>
          <small>YOU ARE THE {c.name}. LOOK FOR THE ▼.</small>
          <button
            onClick={() => {
              game.intro = 0;
              game.phase = "playing";
            }}
          >
            SKIP INTRO <ArrowRight size={14} />
          </button>
        </div>
      )}
      {scoreboard && (
        <div className="modal-backdrop scoreboard">
          <section className="dialog">
            <span className="eyebrow">THE STANDINGS</span>
            <h2>Who's making noise?</h2>
            {[...game.actors]
              .sort((a, b) => b.score - a.score)
              .map((a) => (
                <div className="score-row" key={a.id}>
                  <b>{a.name}</b>
                  <span>{a.score} ELIMINATIONS</span>
                  <span>{a.alive ? "IN PLAY" : "OUT"}</span>
                </div>
              ))}
            <small>RELEASE TAB TO RETURN</small>
          </section>
        </div>
      )}
      {game.phase === "paused" && (
        <div className="modal-backdrop">
          <section className="dialog compact">
            <span className="eyebrow">TAKE A BREATHER</span>
            <h2>Chaos on hold.</h2>
            <p>Your next move can wait.</p>
            <button
              className="primary"
              onClick={() => {
                game.pause();
                useStore.getState().refresh();
              }}
            >
              BACK TO THE BLAST <Play size={18} />
            </button>
            <button className="secondary" onClick={() => start(tutorial)}>
              START OVER <RotateCcw size={17} />
            </button>
            <button className="text-button" onClick={() => setScreen("home")}>
              RETURN TO MAIN MENU <ArrowUpRight size={17} />
            </button>
          </section>
        </div>
      )}
      {game.phase === "finished" && (
        <div className="modal-backdrop results-backdrop">
          {game.winner === "YOU" &&
            save.settings.particles &&
            !save.settings.reducedMotion && (
              <div className="victory-confetti">
                {Array.from({ length: 28 }, (_, i) => (
                  <i
                    key={i}
                    style={{
                      left: `${i * 3.7}%`,
                      background:
                        i % 3 === 0
                          ? "#dc5348"
                          : i % 3 === 1
                            ? "#e5bb65"
                            : "#a5be8f",
                      animationDelay: `${(i % 7) * -0.5}s`,
                      animationDuration: `${2.5 + (i % 5) * 0.3}s`,
                    }}
                  />
                ))}
              </div>
            )}
          <section className="dialog results">
            <span className="eyebrow">
              {game.winner === "YOU"
                ? "THE ARENA IS YOURS"
                : game.winner === "DRAW"
                  ? "EVERYBODY WENT OUT WITH A BANG"
                  : "EVERY BLAST IS A LESSON"}
            </span>
            <h2>
              {game.winner === "YOU"
                ? "YOU MADE\nYOUR MARK."
                : game.winner === "DRAW"
                  ? "A BIG,\nBEAUTIFUL DRAW."
                  : "OUT, BUT\nNOT OVER."}
            </h2>
            <p>
              {game.winner === "YOU"
                ? "Victory looks good on you."
                : `Winner: ${game.winner}`}
            </p>
            <div className="result-stats">
              {[
                ["ELIMINATIONS", game.stats.kills],
                ["BOMBS", game.stats.bombs],
                ["CRATES", game.stats.blocks],
                ["PICKUPS", game.stats.pickups],
                ["CHAINS", game.stats.chains],
                ["TIME", formatTime(game.time)],
              ].map(([k, v]) => (
                <div key={k}>
                  <small>{k}</small>
                  <b>{v}</b>
                </div>
              ))}
            </div>
            <div className="reward-row">
              <span>
                <Zap /> +{reward?.xp ?? 0} XP
              </span>
              <span>
                <Coins /> +{reward?.coins ?? 0} BOOM COINS
              </span>
            </div>
            {reward?.newAchievements.map((id) => (
              <div className="achievement-toast" key={id}>
                <Trophy size={16} />{" "}
                {achievements.find((a) => a[0] === id)?.[1]} unlocked
              </div>
            ))}
            <div className="result-actions">
              <RankedSubmission key={game.rankedToken} game={game} />
              <button className="primary" onClick={() => start(tutorial)}>
                ONE MORE MATCH <RotateCcw size={20} />
              </button>
              <button className="secondary" onClick={() => setScreen("home")}>
                MAIN MENU <ArrowUpRight size={20} />
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
