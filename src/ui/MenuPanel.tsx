import { ChevronLeft } from "lucide-react";
import { useStore, type Screen } from "../store";
import { characters } from "../game/definitions";
import Setup from "./Setup";
import Characters from "./Characters";
import Customize from "./Customize";
import Shop from "./Shop";
import Records from "./Records";
import Settings from "./Settings";
import Leaderboard from "./Leaderboard";
export default function MenuPanel() {
  const screen = useStore((s) => s.screen);
  const titles: Partial<Record<Screen, [string, string]>> = {
    setup: ["MAKE SOME NOISE", "Set the stage."],
    characters: ["MEET THE TROUBLEMAKERS", "Pick your player."],
    customize: ["A LITTLE SELF EXPRESSION", "Make it yours."],
    shop: ["EARN IT. WEAR IT.", "The Boom Shop."],
    records: ["EVERY BLAST COUNTS", "Your story so far."],
    settings: ["FINE-TUNE THE CHAOS", "In your control."],
    leaderboard: ["THE WORLD IS KEEPING SCORE", "Global leaderboard."],
  };
  const title = titles[screen]!;
  return (
    <main className={"menu-panel panel-" + screen}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{title[0]}</span>
          <h2>{title[1]}</h2>
        </div>
        <button
          className="back-button"
          onClick={() =>
            useStore
              .getState()
              .setScreen(
                screen === "settings" &&
                  useStore.getState().settingsReturn === "match"
                  ? "match"
                  : "home",
              )
          }
        >
          <ChevronLeft size={16} /> BACK
        </button>
      </div>
      {screen === "setup" ? (
        <Setup />
      ) : screen === "characters" ? (
        <Characters />
      ) : screen === "customize" ? (
        <Customize />
      ) : screen === "shop" ? (
        <Shop />
      ) : screen === "records" ? (
        <Records />
      ) : screen === "leaderboard" ? (
        <Leaderboard />
      ) : (
        <Settings />
      )}
    </main>
  );
}
