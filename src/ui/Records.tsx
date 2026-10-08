import { useState } from "react";
import { ArrowUpRight, Zap, Coins, Trophy, Target, Lock } from "lucide-react";
import { useStore } from "../store";
import { achievements } from "./common";
export default function Records() {
  const { save, claimChallenge } = useStore();
  const [tab, setTab] = useState("overview");
  return (
    <>
      <div className="tab-row">
        {["overview", "achievements", "challenges"].map((v) => (
          <button
            key={v}
            className={tab === v ? "selected" : ""}
            onClick={() => setTab(v)}
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <>
          <div className="stat-grid">
            {[
              ["MATCHES PLAYED", save.matches],
              ["VICTORIES", save.wins],
              ["ELIMINATIONS", save.kills],
              [
                "WIN RATE",
                `${save.matches ? Math.round((save.wins / save.matches) * 100) : 0}%`,
              ],
              ["BOMBS PLANTED", save.bombs],
              ["CRATES DESTROYED", save.blocks],
              ["POWER-UPS COLLECTED", save.pickups],
              ["BEST SURVIVAL WAVE", save.bestWave],
            ].map(([label, value]) => (
              <div className="stat-card" key={label}>
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="progress-card">
            <Zap size={30} />
            <div>
              <b>LEVEL {1 + Math.floor(save.xp / 400)}</b>
              <span>{save.xp % 400} / 400 XP TO YOUR NEXT LEVEL</span>
              <div className="progress">
                <i style={{ width: `${(save.xp % 400) / 4}%` }} />
              </div>
            </div>
            <span>{save.xp} TOTAL XP</span>
          </div>
          <p className="records-note">
            Your story is saved on this browser. Every finished match earns XP
            and Boom Coins.
          </p>
        </>
      ) : tab === "challenges" ? (
        <div className="challenge-grid">
          {(
            [
              {
                id: "wins",
                name: "Winner’s circle",
                goal: 3,
                verb: "Win 3 matches",
              },
              {
                id: "kills",
                name: "Making a statement",
                goal: 5,
                verb: "Eliminate 5 rivals",
              },
              {
                id: "blocks",
                name: "Clear a little space",
                goal: 30,
                verb: "Destroy 30 crates",
              },
            ] as const
          ).map((c) => {
            const claims = save.challengeClaims[c.id] ?? 0,
              progress = Math.max(0, save[c.id] - claims * c.goal);
            return (
              <div className="challenge-card" key={c.id}>
                <Target size={25} />
                <small>REPEATABLE CHALLENGE / ROUND {claims + 1}</small>
                <h3>{c.name}</h3>
                <p>
                  {c.verb} · {Math.min(progress, c.goal)} / {c.goal}
                </p>
                <div className="progress">
                  <i
                    style={{
                      width: `${Math.min((progress / c.goal) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span>+75 BOOM COINS / +100 XP</span>
                <button
                  className="primary"
                  disabled={progress < c.goal}
                  onClick={() => claimChallenge(c.id)}
                >
                  {progress >= c.goal ? "CLAIM YOUR REWARD" : "IN PROGRESS"}{" "}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="achievement-grid">
          {achievements.map(([id, name, description]) => (
            <div
              key={id}
              className={
                "achievement " +
                (save.achievements.includes(id) ? "earned" : "")
              }
            >
              <span>
                {save.achievements.includes(id) ? <Trophy /> : <Lock />}
              </span>
              <div>
                <b>{name}</b>
                <p>{description}</p>
                <small>
                  {save.achievements.includes(id)
                    ? "UNLOCKED · +25 BOOM COINS"
                    : "WAITING FOR YOUR MOMENT"}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
