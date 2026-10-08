import { useEffect, useState } from "react";
import { Trophy, RefreshCw, Globe, Play } from "lucide-react";
import type { Game } from "../game/engine";
import { characters, type MatchConfig } from "../game/definitions";
import { useStore } from "../store";
import { formatTime } from "./common";
interface Entry {
  name: string;
  character: string;
  score: number;
  kills: number;
  won: number;
  duration: number;
  day: string;
}
async function api(path: string, data?: unknown) {
  const response = await fetch(path, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Leaderboard unavailable");
  return result;
}
function identity() {
  let player = localStorage.getItem("bombastic-player-id");
  if (!player) {
    player = crypto.randomUUID();
    localStorage.setItem("bombastic-player-id", player);
  }
  return player;
}
export function RankedSubmission({ game }: { game: Game }) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  if (!game.rankedToken) return null;
  const submit = async () => {
    setBusy(true);
    setStatus("Checking your replay…");
    try {
      const result = await api("/api/ranked/finish", {
        token: game.rankedToken,
        replay: game.replay,
      });
      setStatus(`VERIFIED · ${result.score.toLocaleString()} POINTS SAVED`);
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Unable to submit. Try again.",
      );
      setBusy(false);
    }
  };
  return (
    <div className="ranked-submit">
      <button
        className="secondary"
        disabled={busy}
        onClick={() => void submit()}
      >
        <Globe size={16} />{" "}
        {busy ? "SCORE SUBMITTED" : "SUBMIT TO GLOBAL LEADERBOARD"}
      </button>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
export default function Leaderboard() {
  const save = useStore((s) => s.save);
  const [scope, setScope] = useState("daily"),
    [entries, setEntries] = useState<Entry[]>([]),
    [status, setStatus] = useState("Loading shared scores…"),
    [connected, setConnected] = useState(false),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(
      () => localStorage.getItem("bombastic-ranked-name") || "",
    ),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setStatus("Loading shared scores…");
    api(`/api/leaderboard?scope=${scope}`)
      .then((data) => {
        if (!cancelled) {
          setEntries(data.entries);
          setConnected(true);
          setStatus("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConnected(false);
          setStatus(
            "Leaderboard server is offline. Start the game server to connect.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scope, reload]);
  const start = async () => {
    setBusy(true);
    setStatus("Preparing your ranked match…");
    try {
      const result: { token: string; config: MatchConfig; character: string } =
        await api("/api/ranked/start", {
          player: identity(),
          name,
          character: save.character,
        });
      localStorage.setItem("bombastic-ranked-name", name.trim());
      useStore.getState().start(false, result.config);
      const game = useStore.getState().game;
      game.rankedToken = result.token;
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Unable to connect");
    }
    setBusy(false);
  };
  return (
    <section className="leaderboard">
      <button
        className="text-button records-link"
        onClick={() => useStore.getState().setScreen("records")}
      >
        YOUR PERSONAL RECORDS <Trophy size={14} />
      </button>
      <div className="ranked-banner">
        <div>
          <span className="eyebrow">
            <Globe size={15} /> SHARED RANKINGS
          </span>
          <h3>
            MAKE YOUR NAME
            <br />
            LOUDER.
          </h3>
          <p>
            Two minutes. Three floors. Race to five KOs.
            <br />
            Same daily arena, hard bots, server-verified scores.
          </p>
        </div>
        <Trophy size={80} />
      </div>
      <div className="ranked-controls">
        <label className="field">
          <span>YOUR PLAYER NAME</span>
          <input
            aria-label="Ranked player name"
            value={name}
            maxLength={20}
            placeholder="2–20 characters"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          className="primary"
          disabled={!connected || busy || name.trim().length < 2}
          onClick={() => void start()}
        >
          <Play size={18} /> {busy ? "CONNECTING…" : "PLAY RANKED"}
        </button>
      </div>
      <p className="ranking-help">
        Win +1,000 · KO +150 · crate +10 · pickup +15 · fast victory bonus. Your
        name and score are shared when you submit a completed ranked run.
      </p>
      <div className="ranking-tabs">
        <button
          className={scope === "daily" ? "active" : ""}
          onClick={() => setScope("daily")}
        >
          TODAY
        </button>
        <button
          className={scope === "all" ? "active" : ""}
          onClick={() => setScope("all")}
        >
          ALL TIME
        </button>
        <button
          aria-label="Refresh leaderboard"
          onClick={() => setReload(reload + 1)}
        >
          <RefreshCw size={16} />
        </button>
        <span>{connected ? "CONNECTED TO SHARED SERVER" : "OFFLINE"}</span>
      </div>
      {status && <p role="status">{status}</p>}
      {!status && !entries.length && (
        <div className="ranking-empty">
          <Trophy size={32} />
          <h3>The board is yours to open.</h3>
          <p>Complete a ranked match and submit your first score.</p>
        </div>
      )}
      {entries.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>RANK</th>
              <th>PLAYER</th>
              <th>POINTS</th>
              <th>KOs</th>
              <th>TIME</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i}>
                <td>
                  <b>{String(i + 1).padStart(2, "0")}</b>
                </td>
                <td>
                  {entry.name}
                  <small>
                    {characters.find((c) => c.id === entry.character)?.name} ·{" "}
                    {entry.won ? "VICTORY" : "COMPLETED"}
                  </small>
                </td>
                <td>
                  <strong>{entry.score.toLocaleString()}</strong>
                </td>
                <td>{entry.kills}</td>
                <td>{formatTime(entry.duration / 1000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
