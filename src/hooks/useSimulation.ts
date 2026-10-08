import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useStore } from "../store";
import { Game } from "../game/engine";
import { soundtrack } from "../game/audio";
export default function useSimulation() {
  const held = useRef(new Set<string>()),
    queued = useRef({
      bomb: false,
      ability: false,
      secondary: false,
      cycle: false,
      remote: false,
    });
  useEffect(() => {
    let raf = 0,
      last = performance.now(),
      acc = 0,
      hud = 0;
    const frame = (now: number) => {
      const state = useStore.getState();
      const elapsed = Math.min((now - last) / 1000, 0.1);
      last = now;
      acc += elapsed;
      const game = state.game;
      if (state.screen === "match") {
        soundtrack.mood =
          game.phase === "finished"
            ? game.winner === "YOU"
              ? "win"
              : "lose"
            : game.shrink
              ? "danger"
              : "battle";
        while (acc >= 1 / 60) {
          const p = game.player,
            b = state.save.settings.bindings;
          if (game.phase === "playing") {
            let dir = -1;
            if (held.current.has(b.up) || held.current.has("ArrowUp")) dir = 0;
            else if (
              held.current.has(b.right) ||
              held.current.has("ArrowRight")
            )
              dir = 1;
            else if (held.current.has(b.down) || held.current.has("ArrowDown"))
              dir = 2;
            else if (held.current.has(b.left) || held.current.has("ArrowLeft"))
              dir = 3;
            let actions = 0;
            if (p.move <= 0) {
              if (queued.current.bomb) actions |= 1;
              if (queued.current.ability) actions |= 2;
              if (queued.current.secondary) actions |= 4;
              if (queued.current.cycle) actions |= 8;
              if (queued.current.remote) actions |= 16;
              queued.current = {
                bomb: false,
                ability: false,
                secondary: false,
                cycle: false,
                remote: false,
              };
            }
            game.control(dir, actions);
          }
          game.step(1 / 60);
          acc -= 1 / 60;
        }
        hud += elapsed;
        if (hud > 0.08) {
          state.refresh();
          hud = 0;
        }
      } else if (state.screen === "home" && !game.onFinish) {
        soundtrack.mood = "menu";
        while (acc >= 1 / 60) {
          if (
            game.phase === "playing" &&
            game.player.move === 0 &&
            Math.floor(game.time * 60) % 20 === 0
          )
            game.bot(game.player);
          game.step(1 / 60);
          if (game.phase === "finished")
            useStore.setState({
              game: new Game(state.config, state.save.character),
            });
          acc -= 1 / 60;
        }
      } else {
        soundtrack.mood = "menu";
        held.current.clear();
        queued.current = {
          bomb: false,
          ability: false,
          secondary: false,
          cycle: false,
          remote: false,
        };
        acc = 0;
      }
      raf = requestAnimationFrame(frame);
    };
    const down = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if (
        s.screen !== "match" ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      const b = s.save.settings.bindings;
      if (
        [
          "Space",
          "Tab",
          "Escape",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          ...Object.values(b),
        ].includes(e.code)
      )
        e.preventDefault();
      if (e.repeat) return;
      held.current.add(e.code);
      if (e.code === "Escape") {
        s.game.pause();
        s.refresh();
        held.current.clear();
        return;
      }
      if (s.game.phase !== "playing") return;
      if (e.code === b.bomb) queued.current.bomb = true;
      if (e.code === b.ability || e.code === "ShiftLeft")
        queued.current.ability = true;
      if (e.code === b.secondary) queued.current.secondary = true;
      if (e.code === b.cycle) queued.current.cycle = true;
      if (e.code === b.remote) queued.current.remote = true;
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.code);
    const blur = () => {
      held.current.clear();
      queued.current = {
        bomb: false,
        ability: false,
        secondary: false,
        cycle: false,
        remote: false,
      };
      const s = useStore.getState();
      if (
        s.screen === "match" &&
        s.game.phase !== "finished" &&
        s.game.phase !== "paused"
      ) {
        s.game.pause();
        s.refresh();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
}
