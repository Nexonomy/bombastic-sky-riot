import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowRight, RotateCcw, Keyboard } from "lucide-react";
import { useStore } from "../store";
import { cosmetics } from "../game/definitions";
import { Field, keyLabel } from "./common";
export default function Settings() {
  const { save, updateSettings, reset } = useStore();
  const s = save.settings;
  const [binding, setBinding] = useState<string | null>(null),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!binding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (
        ![
          "Escape",
          "Tab",
          "ShiftLeft",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code)
      ) {
        const next = { ...useStore.getState().save.settings.bindings };
        const duplicate = Object.keys(next).find((k) => next[k] === e.code);
        if (duplicate) next[duplicate] = next[binding];
        next[binding] = e.code;
        updateSettings({ bindings: next });
      }
      setBinding(null);
    };
    window.addEventListener("keydown", handler, { once: true });
    return () => window.removeEventListener("keydown", handler);
  }, [binding, updateSettings]);
  return (
    <>
      <div className="settings-grid">
        <section>
          <div className="section-label">01 / SOUND & VISION</div>
          {(["master", "music", "sfx"] as const).map((v) => (
            <Field
              label={`${v.toUpperCase()} VOLUME · ${Math.round(s[v] * 100)}%`}
              key={v}
            >
              <input
                type="range"
                min="0"
                max="1"
                step=".05"
                value={s[v]}
                onChange={(e) => updateSettings({ [v]: +e.target.value })}
              />
            </Field>
          ))}
          <div className="fields-grid">
            <Field label="GRAPHICS">
              <select
                value={s.quality}
                onChange={(e) =>
                  updateSettings({ quality: e.target.value as "low" | "high" })
                }
              >
                <option value="high">High · shadows</option>
                <option value="low">Low · performance</option>
              </select>
            </Field>
            <Field label="RESOLUTION SCALE">
              <select
                value={s.scale}
                onChange={(e) => updateSettings({ scale: +e.target.value })}
              >
                {[0.5, 0.75, 1, 1.25].map((v) => (
                  <option key={v} value={v}>
                    {v * 100}%
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={`CAMERA SHAKE · ${Math.round(s.shake * 100)}%`}>
            <input
              type="range"
              min="0"
              max="1"
              step=".1"
              value={s.shake}
              onChange={(e) => updateSettings({ shake: +e.target.value })}
            />
          </Field>
          {(
            [
              "muted",
              "particles",
              "reducedMotion",
              "colorblind",
              "fps",
            ] as const
          ).map((v, i) => (
            <label className="switch-row" key={v}>
              <span>
                {
                  [
                    "Mute all audio",
                    "Explosion particles",
                    "Reduced motion",
                    "Numbered player indicators",
                    "Show frame rate",
                  ][i]
                }
              </span>
              <input
                type="checkbox"
                checked={s[v]}
                onChange={(e) => updateSettings({ [v]: e.target.checked })}
              />
            </label>
          ))}
        </section>
        <section>
          <div className="section-label">02 / YOUR CONTROLS</div>
          <p className="settings-note">
            Click a key to rebind it. Arrow keys, Shift, Escape and Tab remain
            reserved.
          </p>
          <div className="bindings">
            {Object.entries(s.bindings).map(([action, code]) => (
              <div key={action}>
                <span>
                  {action === "secondary"
                    ? "Remote / throw"
                    : action.toUpperCase()}
                </span>
                <button onClick={() => setBinding(action)}>
                  {binding === action ? "PRESS A KEY" : keyLabel(code)}{" "}
                  <Keyboard size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="secondary"
            onClick={() =>
              updateSettings({
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
              })
            }
          >
            RESTORE DEFAULT CONTROLS <RotateCcw size={15} />
          </button>
          <div className="reset-card">
            <h3>A clean slate?</h3>
            <p>Reset your saved coins, cosmetics, records and settings.</p>
            <button
              className="text-button danger"
              onClick={() => setConfirm(true)}
            >
              RESET PROGRESS <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
      </div>
      {confirm && (
        <div className="modal-backdrop">
          <div className="dialog compact">
            <h2>Start fresh?</h2>
            <p>This clears all saved progress in this browser.</p>
            <button
              className="primary"
              onClick={() => {
                reset();
                setConfirm(false);
              }}
            >
              RESET MY PROGRESS
            </button>
            <button className="secondary" onClick={() => setConfirm(false)}>
              KEEP MY STORY
            </button>
          </div>
        </div>
      )}
    </>
  );
}
