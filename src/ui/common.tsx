import { type ReactNode } from "react";
import {
  Bomb,
  Maximize,
  Trophy,
  Palette,
  ShoppingBag,
  Users,
} from "lucide-react";
import { useStore, type Screen } from "../store";
import { characters } from "../game/definitions";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function formatTime(s: number) {
  return `${Math.floor(Math.max(0, s) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(Math.max(0, s) % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function keyLabel(code: string) {
  return code === "Space"
    ? "SPACE"
    : code.replace("Key", "").replace("Arrow", "").replace("Digit", "");
}

export function Logo() {
  return (
    <button
      className="logo"
      aria-label="Main menu"
      onClick={() => useStore.getState().setScreen("home")}
    >
      <span className="logo-mark">
        <Bomb size={22} />
      </span>
      <span>
        BOMBASTIC<small>BIG BOMBS. BIGGER CHAOS.</small>
      </span>
    </button>
  );
}

export function Fullscreen() {
  return (
    <button
      className="icon-button"
      title="Toggle fullscreen"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else
          void document.documentElement
            .requestFullscreen()
            .catch(() =>
              useStore
                .getState()
                .notify("Fullscreen is unavailable in this browser"),
            );
      }}
    >
      <Maximize size={17} />
    </button>
  );
}

export const achievements = [
  ["first-blast", "First blast", "Place your first bomb."],
  ["first-blood", "First blood", "Eliminate a rival."],
  ["chain-master", "Chain master", "Trigger a bomb chain."],
  ["untouchable", "Untouchable", "Win without taking damage."],
  ["champion", "Champion", "Win five matches."],
  ["collector", "Bomb collector", "Collect five pickups in a match."],
  ["speed-demon", "Speed demon", "Win in under 45 seconds."],
  ["king-slayer", "King slayer", "Defeat King Kaboom."],
];

export const navItems: {
  screen: Screen;
  label: string;
  icon: ReactNode;
  number: string;
}[] = [
  {
    screen: "characters",
    label: "Characters",
    icon: <Users size={17} />,
    number: "01",
  },
  {
    screen: "customize",
    label: "Style lab",
    icon: <Palette size={17} />,
    number: "02",
  },
  {
    screen: "shop",
    label: "Boom shop",
    icon: <ShoppingBag size={17} />,
    number: "03",
  },
  {
    screen: "leaderboard",
    label: "Global leaderboard",
    icon: <Trophy size={17} />,
    number: "04",
  },
];
