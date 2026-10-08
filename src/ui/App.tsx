import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Settings2,
  Volume2,
  VolumeX,
  X,
  Coins,
  Check,
  HelpCircle,
} from "lucide-react";
import { useStore } from "../store";
import { World } from "../game/Scene";
import { initAudio, sound } from "../game/audio";
import { keyLabel, Logo, Fullscreen } from "./common";
import useSimulation from "../hooks/useSimulation";
import Home from "./Home";
import Match from "./Match";
import MenuPanel from "./MenuPanel";

export default function App() {
  useSimulation();
  const { screen, save, toast } = useStore();
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const fn = () => initAudio();
    let hovered: EventTarget | null = null,
      last = 0;
    const hover = (event: PointerEvent) => {
      const button = (event.target as HTMLElement)?.closest("button");
      if (button && hovered !== button && performance.now() - last > 100) {
        hovered = button;
        last = performance.now();
        sound("ui");
      }
    };
    window.addEventListener("pointerdown", fn, { once: true });
    window.addEventListener("pointerover", hover);
    return () => {
      window.removeEventListener("pointerdown", fn);
      window.removeEventListener("pointerover", hover);
    };
  }, []);
  return (
    <div className={"app " + (screen === "match" ? "in-match" : "")}>
      <div className="paper-grain" />
      <div className="world-backdrop" />
      <div
        className={
          "world " +
          (screen === "home"
            ? "home-world"
            : screen === "match"
              ? "match-world"
              : "menu-world")
        }
      >
        <World />
      </div>
      <header>
        <Logo />
        <div className="header-right">
          <span className="version">
            <i /> SKY RIOT / VOL. 02
          </span>
          <span className="coins">
            <Coins size={16} />
            {save.coins.toLocaleString()}
          </span>
          <span className="level">LV. {1 + Math.floor(save.xp / 400)}</span>
          <button
            className="icon-button"
            title={save.settings.muted ? "Unmute audio" : "Mute audio"}
            onClick={() =>
              useStore
                .getState()
                .updateSettings({ muted: !save.settings.muted })
            }
          >
            {save.settings.muted ? (
              <VolumeX size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
          <Fullscreen />
          <button
            className="icon-button"
            title="Settings"
            onClick={() => useStore.getState().setScreen("settings")}
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>
      {screen === "home" ? (
        <Home setHelp={setHelp} />
      ) : screen === "match" ? (
        <Match />
      ) : (
        <MenuPanel />
      )}
      {screen !== "match" && (
        <footer className="page-footer">
          <span>
            <i className="live-dot" /> ONE MORE MATCH. YOU KNOW YOU WANT TO.
          </span>
          <button onClick={() => setHelp(true)}>
            <HelpCircle size={14} /> HOW TO PLAY
          </button>
          <span className="footer-right">
            A SMALL WORLD. A BIG BLAST. <ArrowUpRight size={14} />
          </span>
        </footer>
      )}
      {toast && (
        <div className="toast">
          <Check size={18} />
          {toast}
        </div>
      )}
      {help && (
        <div className="modal-backdrop">
          <section className="dialog help">
            <button
              className="close"
              aria-label="Close help"
              onClick={() => setHelp(false)}
            >
              <X />
            </button>
            <span className="eyebrow">YOUR FIRST BLAST</span>
            <h2>
              Small moves.
              <br />
              Big consequences.
            </h2>
            <p>
              Destroy crates, collect upgrades, and outlast your rivals. Bombs
              explode in a cross. Stone stops the blast; wood takes the hit.
              Give yourself an escape route.
            </p>
            <div className="control-list">
              <span>
                <kbd>W A S D</kbd> / arrows
              </span>
              <b>Move</b>
              <span>
                <kbd>{keyLabel(save.settings.bindings.bomb)}</kbd>
              </span>
              <b>Place bomb</b>
              <span>
                <kbd>{keyLabel(save.settings.bindings.ability)}</kbd> / SHIFT
              </span>
              <b>Character ability</b>
              <span>
                <kbd>{keyLabel(save.settings.bindings.secondary)}</kbd>
              </span>
              <b>Pick up / throw</b>
              <span>
                <kbd>ESC</kbd>
              </span>
              <b>Pause</b>
              <span>
                <kbd>{keyLabel(save.settings.bindings.cycle)}</kbd>
              </span>
              <b>Change bomb type</b>
              <span>
                <kbd>{keyLabel(save.settings.bindings.remote)}</kbd>
              </span>
              <b>Detonate remote bombs</b>
            </div>
            <button
              className="primary"
              onClick={() => {
                setHelp(false);
                useStore.getState().start(true);
              }}
            >
              PLAY THE TUTORIAL <ArrowUpRight />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
