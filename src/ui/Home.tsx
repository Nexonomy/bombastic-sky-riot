import {
  ArrowUpRight,
  ArrowRight,
  Zap,
  ChevronRight,
  Shuffle,
  Play,
} from "lucide-react";
import { useStore } from "../store";
import { biomes, characters } from "../game/definitions";
import { Game } from "../game/engine";
import { sound } from "../game/audio";
import { navItems } from "./common";
export default function Home({ setHelp }: { setHelp: (v: boolean) => void }) {
  const { setScreen, save, start, config, setConfig } = useStore();
  const biome = biomes.find((b) => b.id === config.biome) ?? biomes[0];
  return (
    <main className="home">
      <section className="home-copy">
        <div className="eyebrow">
          <span className="tiny-slash" /> STRATEGY MEETS BEAUTIFUL CHAOS
        </div>
        <div className="title-lockup">
          <span className="title-volume">EST. 2026 / SKY RIOT / VOL. 02</span>
          <h1>
            BOMB<span>ASTIC</span>
            <i>✦</i>
          </h1>
          <div className="title-underline" />
        </div>
        <h2>
          Big bombs.
          <br />
          Bigger chaos.
        </h2>
        <p>
          Three floors. Twelve ways to blast.
          <br />
          Make your move. Leave your mark.
        </p>
        <button className="play-button" onClick={() => setScreen("setup")}>
          <span>
            LET’S PLAY<small>YOUR NEXT GREAT ESCAPE STARTS HERE</small>
          </span>
          <ArrowUpRight size={33} />
        </button>
        <button className="tutorial-link" onClick={() => setHelp(true)}>
          <Play size={13} fill="currentColor" />{" "}
          {save.tutorial ? "REPLAY THE BASICS" : "FIRST TIME? LEARN THE BASICS"}{" "}
          <ArrowRight size={15} />
        </button>
        <nav className="home-nav">
          {navItems.map((n) => (
            <button key={n.screen} onClick={() => setScreen(n.screen)}>
              <span className="nav-number">{n.number}</span>
              {n.icon}
              <span>{n.label}</span>
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
      </section>
      <div className="island-annotation">
        <span className="eyebrow">01 / THE ARENA</span>
        <h3>{biome.name}</h3>
        <span>TAKE THE STAIRS. OWN THE SKY.</span>
        <div className="annotation-line" />
      </div>
      <div className="arena-pill">
        <span className="live-dot" /> PROCEDURALLY YOURS{" "}
        <span>SEED / {config.seed}</span>
      </div>
      <div className="home-bottom">
        <button
          className="feature-card"
          onClick={() => setScreen("characters")}
        >
          <div className="feature-icon">
            <Zap size={21} />
          </div>
          <span>
            <small>FIND YOUR ALTER EGO</small>
            <b>6 characters. Your style.</b>
          </span>
          <ArrowUpRight size={20} />
        </button>
        <button
          className="feature-card"
          onClick={() => {
            const seed = Math.random().toString(36).slice(2, 10).toUpperCase();
            setConfig({ seed });
            useStore.setState({
              game: new Game({ ...config, seed }, save.character),
            });
            sound("ui");
          }}
        >
          <div className="feature-icon">
            <Shuffle size={21} />
          </div>
          <span>
            <small>NO TWO BLASTS ALIKE</small>
            <b>A new world, every time.</b>
          </span>
          <ArrowUpRight size={20} />
        </button>
        <button
          className="quick-play"
          onClick={() => start()}
          title="Quick play with current settings"
        >
          QUICK PLAY <ArrowRight size={18} />
        </button>
      </div>
      <div className="world-coordinate">
        35° N / 45° E<br />
        ESCAPE THE ORDINARY.
      </div>
    </main>
  );
}
