import { ArrowUpRight, ShoppingBag, Check } from "lucide-react";
import { useStore } from "../store";
import { cosmetics } from "../game/definitions";
import { World } from "../game/Scene";
import { Game } from "../game/engine";
import { Field } from "./common";
export default function Customize() {
  const { save, updateSave, setScreen } = useStore();
  const owned = cosmetics.filter((c) => save.owned.includes(c.id));
  return (
    <div className="character-layout">
      <div className="preview-stage">
        <div className="preview-number">YOU.</div>
        <World preview />
        <span className="preview-caption">LOOK GOOD. MAKE TROUBLE.</span>
      </div>
      <section className="custom-controls">
        <div className="section-label">01 / YOUR TRUE COLORS</div>
        <div className="color-row">
          <Field label="PRIMARY">
            <input
              type="color"
              value={save.color}
              onChange={(e) => updateSave({ color: e.target.value })}
            />
          </Field>
          <Field label="ACCENT">
            <input
              type="color"
              value={save.accent}
              onChange={(e) => updateSave({ accent: e.target.value })}
            />
          </Field>
          <Field label="EYE COLOR">
            <input
              type="color"
              value={save.eyeColor}
              onChange={(e) => updateSave({ eyeColor: e.target.value })}
            />
          </Field>
        </div>
        <div className="fields-grid">
          <Field label="EYES">
            <select
              value={save.eyes}
              onChange={(e) =>
                updateSave({ eyes: e.target.value as "round" | "sharp" })
              }
            >
              <option value="round">Wide awake</option>
              <option value="sharp">Game face</option>
            </select>
          </Field>
          <Field label="BODY PATTERN">
            <select
              value={save.pattern ? "stripe" : "plain"}
              onChange={(e) =>
                updateSave({ pattern: e.target.value === "stripe" })
              }
            >
              <option value="plain">Solid color</option>
              <option value="stripe">Racing stripe</option>
            </select>
          </Field>
        </div>
        <div className="section-label">02 / FINISHING TOUCHES</div>
        <div className="fields-grid">
          <Field label="BODY FINISH">
            <select
              value={save.finish}
              onChange={(e) =>
                updateSave({ finish: e.target.value as "matte" | "gloss" })
              }
            >
              <option value="matte">Soft matte</option>
              <option value="gloss">Gloss lacquer</option>
            </select>
          </Field>
          <Field label="HEADWEAR">
            <select
              value={save.hat}
              onChange={(e) => updateSave({ hat: e.target.value })}
            >
              <option value="none">Original antenna</option>
              {owned
                .filter((c) => c.category === "headwear")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="OUTFIT">
            <select
              value={save.outfit}
              onChange={(e) => updateSave({ outfit: e.target.value })}
            >
              <option value="basic">The original</option>
              {owned
                .filter((c) => c.category === "outfit")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="BOMB FINISH">
            <select
              value={save.bombSkin}
              onChange={(e) => updateSave({ bombSkin: e.target.value })}
            >
              <option value="classic">Midnight matte</option>
              {owned
                .filter((c) => c.category === "bomb")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="FOOTSTEP EFFECT">
            <select
              value={save.trail ? "trail" : "none"}
              onChange={(e) =>
                updateSave({ trail: e.target.value === "trail" })
              }
            >
              <option value="none">Keep it clean</option>
              {save.owned.includes("trail") && (
                <option value="trail">Star runner</option>
              )}
            </select>
          </Field>
        </div>
        <button className="shop-link" onClick={() => setScreen("shop")}>
          <ShoppingBag size={18} />
          <span>
            A little more you.
            <small>Discover cosmetics in the Boom Shop.</small>
          </span>
          <ArrowUpRight size={19} />
        </button>
        <p className="saved-note">
          <Check size={14} /> Your style is saved automatically. All looks, no
          stat boosts.
        </p>
        <button className="primary" onClick={() => setScreen("setup")}>
          READY TO MAKE A SCENE <ArrowUpRight />
        </button>
      </section>
    </div>
  );
}
