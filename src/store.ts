import { create } from "zustand";
import {
  defaultConfig,
  characters,
  cosmetics,
  type MatchConfig,
} from "./game/definitions";
import { Game } from "./game/engine";
import { audioSettings, initAudio, sound } from "./game/audio";
export interface Save {
  version: 1;
  character: string;
  color: string;
  accent: string;
  finish: "matte" | "gloss";
  pattern: boolean;
  eyes: "round" | "sharp";
  eyeColor: string;
  hat: string;
  outfit: string;
  bombSkin: string;
  trail: boolean;
  owned: string[];
  coins: number;
  xp: number;
  matches: number;
  wins: number;
  kills: number;
  bestWave: number;
  bombs: number;
  blocks: number;
  pickups: number;
  chains: number;
  challengeClaims: Record<string, number>;
  achievements: string[];
  seeds: string[];
  tutorial: boolean;
  settings: {
    master: number;
    music: number;
    sfx: number;
    muted: boolean;
    quality: "low" | "high";
    scale: number;
    shake: number;
    particles: boolean;
    reducedMotion: boolean;
    colorblind: boolean;
    fps: boolean;
    bindings: Record<string, string>;
  };
}
export const freshSave = (): Save => ({
  version: 1,
  character: "boomer",
  color: "#ed5646",
  accent: "#ffc564",
  finish: "matte",
  pattern: false,
  eyes: "round",
  eyeColor: "#17272b",
  hat: "none",
  outfit: "basic",
  bombSkin: "classic",
  trail: false,
  owned: [],
  coins: 200,
  xp: 0,
  matches: 0,
  wins: 0,
  kills: 0,
  bestWave: 0,
  bombs: 0,
  blocks: 0,
  pickups: 0,
  chains: 0,
  challengeClaims: { wins: 0, kills: 0, blocks: 0 },
  achievements: [],
  seeds: [],
  tutorial: false,
  settings: {
    master: 0.65,
    music: 0.18,
    sfx: 0.65,
    muted: false,
    quality: "high",
    scale: 1,
    shake: 0.4,
    particles: true,
    reducedMotion: false,
    colorblind: false,
    fps: false,
    bindings: {
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
      bomb: "Space",
      ability: "KeyE",
      secondary: "KeyQ",
      cycle: "KeyR",
      remote: "KeyF",
    },
  },
});
export function loadSave(raw: string | null): Save {
  const base = freshSave();
  try {
    const data = JSON.parse(raw ?? "null");
    if (!data || data.version !== 1) return base;
    const save = {
      ...base,
      ...data,
      settings: {
        ...base.settings,
        ...data.settings,
        bindings: { ...base.settings.bindings, ...data.settings?.bindings },
      },
    } as Save;
    for (const n of [
      "coins",
      "xp",
      "matches",
      "wins",
      "kills",
      "bestWave",
      "bombs",
      "blocks",
      "pickups",
      "chains",
    ] as const)
      save[n] = Number.isFinite(save[n]) ? Math.max(0, save[n]) : 0;
    if (!characters.some((c) => c.id === save.character))
      save.character = "boomer";
    save.owned = Array.isArray(save.owned)
      ? save.owned.filter((v) => cosmetics.some((c) => c.id === v))
      : [];
    save.achievements = Array.isArray(save.achievements)
      ? save.achievements.filter((v) => typeof v === "string")
      : [];
    save.seeds = Array.isArray(save.seeds)
      ? save.seeds.filter((v) => typeof v === "string").slice(0, 8)
      : [];
    save.challengeClaims = Object.fromEntries(
      ["wins", "kills", "blocks"].map((k) => [
        k,
        Number.isFinite(save.challengeClaims?.[k])
          ? Math.max(0, Math.floor(save.challengeClaims[k]))
          : 0,
      ]),
    );
    for (const slot of ["hat", "outfit", "bombSkin"] as const) {
      const defaults = { hat: "none", outfit: "basic", bombSkin: "classic" };
      if (save[slot] !== defaults[slot] && !save.owned.includes(save[slot]))
        save[slot] = defaults[slot];
    }
    if (!/^#[0-9a-f]{6}$/i.test(save.color)) save.color = base.color;
    if (!/^#[0-9a-f]{6}$/i.test(save.accent)) save.accent = base.accent;
    if (!/^#[0-9a-f]{6}$/i.test(save.eyeColor)) save.eyeColor = base.eyeColor;
    if (!["matte", "gloss"].includes(save.finish)) save.finish = "matte";
    if (!["round", "sharp"].includes(save.eyes)) save.eyes = "round";
    if (!save.owned.includes("trail")) save.trail = false;
    for (const action of Object.keys(base.settings.bindings)) {
      const code = save.settings.bindings[action];
      if (
        typeof code !== "string" ||
        !/^Key[A-Z]$|^Digit[0-9]$|^Space$|^Enter$|^ControlLeft$|^AltLeft$/.test(
          code,
        )
      )
        save.settings.bindings[action] = base.settings.bindings[action];
    }
    for (const v of ["master", "music", "sfx", "scale", "shake"] as const)
      save.settings[v] = Number.isFinite(save.settings[v])
        ? Math.max(0, Math.min(v === "scale" ? 1.5 : 1, save.settings[v]))
        : base.settings[v];
    return save;
  } catch {
    return base;
  }
}
function read() {
  try {
    return loadSave(localStorage.getItem("bombastic-save-v1"));
  } catch {
    return freshSave();
  }
}
export type Screen =
  | "leaderboard"
  | "home"
  | "setup"
  | "characters"
  | "customize"
  | "shop"
  | "records"
  | "settings"
  | "match";
interface Store {
  screen: Screen;
  save: Save;
  config: MatchConfig;
  game: Game;
  epoch: number;
  reward: { xp: number; coins: number; newAchievements: string[] } | null;
  toast: string;
  setScreen: (screen: Screen) => void;
  updateSave: (patch: Partial<Save>) => void;
  updateSettings: (patch: Partial<Save["settings"]>) => void;
  setConfig: (patch: Partial<MatchConfig>) => void;
  selectCharacter: (id: string) => void;
  start: (tutorial?: boolean, ranked?: MatchConfig) => void;
  purchase: (id: string) => boolean;
  equip: (id: string) => void;
  reset: () => void;
  claimChallenge: (id: "wins" | "kills" | "blocks") => void;
  settingsReturn: Screen;
  refresh: () => void;
  notify: (text: string) => void;
}
const initial = read();
export const useStore = create<Store>((set, get) => ({
  screen: "home",
  save: initial,
  config: { ...defaultConfig },
  game: new Game(defaultConfig, initial.character),
  epoch: 0,
  reward: null,
  toast: "",
  settingsReturn: "home",
  setScreen: (screen) => {
    initAudio();
    sound("ui");
    if (screen === "settings") {
      set({ settingsReturn: get().screen });
      if (get().screen === "match" && get().game.phase !== "paused")
        get().game.pause();
    }
    set(
      screen === "home"
        ? { screen, game: new Game(get().config, get().save.character) }
        : { screen },
    );
  },
  notify: (toast) => {
    set({ toast });
    setTimeout(() => set({ toast: "" }), 2800);
  },
  refresh: () => set((s) => ({ epoch: s.epoch + 1 })),
  updateSave: (patch) => {
    const save = { ...get().save, ...patch };
    try {
      localStorage.setItem("bombastic-save-v1", JSON.stringify(save));
    } catch {}
    set({ save });
  },
  updateSettings: (patch) => {
    const settings = { ...get().save.settings, ...patch };
    get().updateSave({ settings });
    Object.assign(audioSettings, {
      master: settings.master,
      music: settings.music,
      sfx: settings.sfx,
      mute: settings.muted,
    });
  },
  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  selectCharacter: (id) => {
    const c = characters.find((v) => v.id === id);
    if (c)
      get().updateSave({ character: id, color: c.color, accent: c.accent });
  },
  start: (tutorial = false, ranked?: MatchConfig) => {
    initAudio();
    const state = get();
    const config = tutorial
      ? {
          ...state.config,
          mode: "classic" as const,
          difficulty: "easy" as const,
          bots: 1,
          duration: 240,
          density: 0.22,
          seed: "FIRST-BLAST",
          hazards: false,
          floors: 1,
          water: false,
        }
      : (ranked ?? state.config);
    const game = new Game(config, state.save.character);
    game.onFinish = () => {
      const s = get().save,
        win = game.winner === "YOU";
      const xp =
          60 + game.stats.kills * 30 + game.stats.blocks * 2 + (win ? 120 : 0),
        coins = 30 + game.stats.kills * 15 + (win ? 70 : 0);
      const achieved = [
        ...(game.stats.bombs ? ["first-blast"] : []),
        ...(game.stats.kills ? ["first-blood"] : []),
        ...(game.stats.chains ? ["chain-master"] : []),
        ...(win && game.stats.hits === 0 ? ["untouchable"] : []),
        ...(s.wins + (win ? 1 : 0) >= 5 ? ["champion"] : []),
        ...(win && config.mode === "boss" ? ["king-slayer"] : []),
        ...(game.stats.pickups >= 5 ? ["collector"] : []),
        ...(win && game.time < 45 ? ["speed-demon"] : []),
      ];
      const newAchievements = achieved.filter(
        (a) => !s.achievements.includes(a),
      );
      get().updateSave({
        matches: s.matches + 1,
        wins: s.wins + (win ? 1 : 0),
        kills: s.kills + game.stats.kills,
        bombs: s.bombs + game.stats.bombs,
        blocks: s.blocks + game.stats.blocks,
        pickups: s.pickups + game.stats.pickups,
        chains: s.chains + game.stats.chains,
        bestWave:
          config.mode === "survival"
            ? Math.max(s.bestWave, game.wave)
            : s.bestWave,
        xp: s.xp + xp,
        coins: s.coins + coins + newAchievements.length * 25,
        achievements: [...new Set([...s.achievements, ...achieved])],
        tutorial: s.tutorial || tutorial,
        seeds: [config.seed, ...s.seeds.filter((v) => v !== config.seed)].slice(
          0,
          8,
        ),
      });
      set({
        reward: {
          xp,
          coins: coins + newAchievements.length * 25,
          newAchievements,
        },
      });
    };
    if (tutorial)
      game.announce("MOVE WITH WASD. YOUR FIRST BLAST STARTS HERE.");
    set({ game, screen: "match", reward: null });
  },
  purchase: (id) => {
    const state = get(),
      item = cosmetics.find((c) => c.id === id);
    if (!item || state.save.owned.includes(id) || state.save.coins < item.price)
      return false;
    state.updateSave({
      coins: state.save.coins - item.price,
      owned: [...state.save.owned, id],
    });
    state.equip(id);
    state.notify(`${item.name} unlocked & equipped`);
    sound("pickup");
    return true;
  },
  claimChallenge: (id) => {
    const state = get(),
      s = state.save,
      goal = { wins: 3, kills: 5, blocks: 30 }[id],
      claimed = s.challengeClaims[id] ?? 0;
    if (s[id] < goal * (claimed + 1)) return;
    state.updateSave({
      challengeClaims: { ...s.challengeClaims, [id]: claimed + 1 },
      coins: s.coins + 75,
      xp: s.xp + 100,
    });
    state.notify("Challenge complete · +75 coins / +100 XP");
    sound("pickup");
  },
  equip: (id) => {
    const s = get();
    if (!s.save.owned.includes(id)) return;
    const item = cosmetics.find((c) => c.id === id);
    if (item?.category === "headwear") s.updateSave({ hat: id });
    if (item?.category === "outfit") s.updateSave({ outfit: id });
    if (item?.category === "bomb") s.updateSave({ bombSkin: id });
    if (item?.category === "effect") s.updateSave({ trail: true });
  },
  reset: () => {
    get().updateSave(freshSave());
    get().updateSettings(freshSave().settings);
    get().notify("Progress reset. A fresh start awaits.");
  },
}));
Object.assign(audioSettings, {
  master: initial.settings.master,
  music: initial.settings.music,
  sfx: initial.settings.sfx,
  mute: initial.settings.muted,
});
