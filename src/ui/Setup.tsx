import { useState } from "react";
import {
  ArrowUpRight,
  Bomb,
  ChevronRight,
  ChevronLeft,
  Trophy,
  SlidersHorizontal,
  Palette,
  Target,
  Shuffle,
  Copy,
  Check,
  Shield,
  Flame,
  RotateCcw,
} from "lucide-react";
import { useStore } from "../store";
import { biomes, characters, modes, defaultConfig } from "../game/definitions";
import { World } from "../game/Scene";
import { Game } from "../game/engine";
import { Field } from "./common";
export default function Setup() {
  const { config, setConfig, setScreen, start, save } = useStore();
  const [advanced, setAdvanced] = useState(false);
  const c = characters.find((c) => c.id === save.character)!;
  const biomeIndex = biomes.findIndex((b) => b.id === config.biome);
  const changeBiome = (dir: number) => {
    const b = biomes[(biomeIndex + dir + biomes.length) % biomes.length];
    setConfig({ biome: b.id });
    useStore.setState({
      game: new Game({ ...config, biome: b.id }, save.character),
    });
  };
  return (
    <div className="setup-grid">
      <section>
        <div className="section-label">01 / CHOOSE YOUR CHAOS</div>
        <div className="mode-grid">
          {modes.map((m) => (
            <button
              key={m.id}
              className={
                "mode-option " + (config.mode === m.id ? "selected" : "")
              }
              onClick={() => setConfig({ mode: m.id })}
            >
              <span className="mode-symbol">
                {m.id === "classic" ? (
                  <Bomb />
                ) : m.id === "ffa" ? (
                  <Target />
                ) : m.id === "survival" ? (
                  <Shield />
                ) : m.id === "boss" ? (
                  <Trophy />
                ) : (
                  <Flame />
                )}
              </span>
              <b>{m.name}</b>
              <small>{m.description}</small>
              {config.mode === m.id && (
                <Check className="selected-check" size={16} />
              )}
            </button>
          ))}
        </div>
        <div className="section-label">02 / MAKE IT A FAIR FIGHT</div>
        <div className="fields-grid">
          <Field label="CONNECTED FLOORS">
            <select
              value={config.floors}
              onChange={(e) => setConfig({ floors: +e.target.value })}
            >
              <option value={3}>3 floors · Sky terraces</option>
              <option value={2}>2 floors · Split level</option>
              <option value={1}>1 floor · Classic arena</option>
            </select>
          </Field>
          <Field label="WATER & BRIDGES">
            <select
              value={String(config.water)}
              onChange={(e) => setConfig({ water: e.target.value === "true" })}
            >
              <option value="true">Rivers, bridges & waterfalls</option>
              <option value="false">Dry arena</option>
            </select>
          </Field>
          <Field label="BOT DIFFICULTY">
            <select
              value={config.difficulty}
              onChange={(e) =>
                setConfig({
                  difficulty: e.target.value as typeof config.difficulty,
                })
              }
            >
              {["easy", "normal", "hard", "insane"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="OPPONENTS">
            <select
              value={config.bots}
              disabled={config.mode === "boss"}
              onChange={(e) => setConfig({ bots: +e.target.value })}
            >
              {[1, 2, 3].map((v) => (
                <option key={v} value={v}>
                  {v} BOT{v > 1 ? "S" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ARENA SIZE">
            <select
              value={config.size}
              onChange={(e) =>
                setConfig({ size: e.target.value as typeof config.size })
              }
            >
              {["small", "medium", "large", "custom"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="ROUND LENGTH">
            <select
              value={config.duration}
              onChange={(e) => setConfig({ duration: +e.target.value })}
            >
              {[60, 120, 180, 240].map((v) => (
                <option key={v} value={v}>
                  {v / 60} MINUTE{v > 60 ? "S" : ""}
                </option>
              ))}
            </select>
          </Field>
          {config.size === "custom" && (
            <>
              <Field label="WIDTH (ODD, 9–21)">
                <input
                  type="number"
                  min="9"
                  max="21"
                  step="2"
                  value={config.width}
                  onChange={(e) => setConfig({ width: +e.target.value })}
                />
              </Field>
              <Field label="HEIGHT (ODD, 9–17)">
                <input
                  type="number"
                  min="9"
                  max="17"
                  step="2"
                  value={config.height}
                  onChange={(e) => setConfig({ height: +e.target.value })}
                />
              </Field>
            </>
          )}
        </div>
        <Field label="WORLD SEED">
          <div className="seed-input">
            <input
              value={config.seed}
              maxLength={40}
              onChange={(e) => setConfig({ seed: e.target.value })}
            />
            <button
              title="Random seed"
              onClick={() =>
                setConfig({
                  seed: Math.random().toString(36).slice(2, 10).toUpperCase(),
                })
              }
            >
              <Shuffle size={16} />
            </button>
            <button
              title="Copy seed"
              onClick={() =>
                void navigator.clipboard
                  .writeText(config.seed)
                  .then(() => useStore.getState().notify("World seed copied"))
                  .catch(() =>
                    useStore.getState().notify("Copy the seed from the input"),
                  )
              }
            >
              <Copy size={16} />
            </button>
          </div>
        </Field>
        {save.seeds[0] && (
          <button
            className="text-button"
            onClick={() => setConfig({ seed: save.seeds[0] })}
          >
            REPLAY LAST SEED <RotateCcw size={13} />
          </button>
        )}
        <button
          className="advanced-toggle"
          onClick={() => setAdvanced(!advanced)}
        >
          <SlidersHorizontal size={15} /> {advanced ? "HIDE" : "SHOW"} ADVANCED
          RULES <ChevronRight size={15} />
        </button>
        {advanced && (
          <div className="advanced">
            <div className="preset-row">
              {["Casual", "Competitive", "Chaos"].map((v, i) => (
                <button
                  key={v}
                  onClick={() =>
                    setConfig(
                      i === 0
                        ? {
                            ...defaultConfig,
                            difficulty: "easy",
                            density: 0.25,
                          }
                        : i === 1
                          ? {
                              ...defaultConfig,
                              difficulty: "hard",
                              drops: 0.35,
                            }
                          : {
                              ...defaultConfig,
                              mode: "mayhem",
                              drops: 0.8,
                              capacity: 3,
                              range: 3,
                            },
                    )
                  }
                >
                  {v}
                </button>
              ))}
            </div>
            <Field
              label={`CRATE DENSITY · ${Math.round(config.density * 100)}%`}
            >
              <input
                type="range"
                min="0"
                max=".7"
                step=".05"
                value={config.density}
                onChange={(e) => setConfig({ density: +e.target.value })}
              />
            </Field>
            <Field
              label={`POWER-UP CHANCE · ${Math.round(config.drops * 100)}%`}
            >
              <input
                type="range"
                min="0"
                max="1"
                step=".1"
                value={config.drops}
                onChange={(e) => setConfig({ drops: +e.target.value })}
              />
            </Field>
            <div className="fields-grid">
              <Field label="STARTING BOMBS">
                <select
                  value={config.capacity}
                  onChange={(e) => setConfig({ capacity: +e.target.value })}
                >
                  {[1, 2, 3, 4].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="BLAST RANGE">
                <select
                  value={config.range}
                  onChange={(e) => setConfig({ range: +e.target.value })}
                >
                  {[1, 2, 3, 4].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>
            {(["hazards", "specialBombs", "abilities"] as const).map((v) => (
              <label key={v} className="switch-row">
                <span>
                  {v === "specialBombs"
                    ? "Special bomb drops"
                    : v === "hazards"
                      ? "Environment hazards"
                      : "Character abilities"}
                </span>
                <input
                  type="checkbox"
                  checked={config[v]}
                  onChange={(e) => setConfig({ [v]: e.target.checked })}
                />
              </label>
            ))}
          </div>
        )}
      </section>
      <aside className="setup-aside">
        <div className="biome-card">
          <span className="eyebrow">YOUR DESTINATION</span>
          <div
            className="biome-art"
            style={{
              background: `linear-gradient(145deg,${biomes[biomeIndex].sky},${biomes[biomeIndex].floor})`,
            }}
          >
            <div className="mini-island">
              <div />
              <i />
              <i />
              <i />
              <b>✦</b>
            </div>
            <span>{String(biomeIndex + 1).padStart(2, "0")} / 07</span>
          </div>
          <div className="biome-title">
            <button aria-label="Previous arena" onClick={() => changeBiome(-1)}>
              <ChevronLeft />
            </button>
            <h3>{biomes[biomeIndex].name}</h3>
            <button aria-label="Next arena" onClick={() => changeBiome(1)}>
              <ChevronRight />
            </button>
          </div>
          <small>{biomes[biomeIndex].tag}</small>
        </div>
        <button
          className="fighter-summary"
          onClick={() => setScreen("characters")}
        >
          <span style={{ background: c.color }}>
            <Bomb size={28} />
          </span>
          <div>
            <small>YOUR PLAYER</small>
            <b>{c.name}</b>
            <small>{c.ability.name}</small>
          </div>
          <ArrowUpRight size={20} />
        </button>
        <button className="secondary" onClick={() => setScreen("customize")}>
          <Palette size={17} /> CUSTOMIZE YOUR LOOK <ArrowUpRight size={17} />
        </button>
        <button className="primary" onClick={() => start()}>
          ENTER THE ARENA <ArrowUpRight />
        </button>
        <p className="aside-tip">
          A good bomber always has an exit strategy.
          <br />A great bomber makes one.
        </p>
      </aside>
    </div>
  );
}
