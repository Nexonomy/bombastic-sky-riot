import { ArrowUpRight, Zap, Check } from "lucide-react";
import { useStore } from "../store";
import { characters } from "../game/definitions";
import { World } from "../game/Scene";
import { sound } from "../game/audio";
export default function Characters() {
  const { save, selectCharacter, setScreen } = useStore();
  const c = characters.find((c) => c.id === save.character)!;
  return (
    <div className="character-layout">
      <div className="preview-stage">
        <div className="preview-number">
          {String(characters.indexOf(c) + 1).padStart(2, "0")}
        </div>
        <World preview />
        <span className="preview-caption">YOUR NEXT ALTER EGO / {c.tag}</span>
      </div>
      <section>
        <div className="character-tag">{c.tag}</div>
        <h3 className="character-name">{c.name}</h3>
        <p className="character-description">{c.description}</p>
        <div className="ability-card">
          <Zap />
          <div>
            <small>ACTIVE ABILITY / E</small>
            <b>{c.ability.name}</b>
            <p>{c.ability.description}</p>
            <span>{c.ability.cooldown} SECOND COOLDOWN</span>
          </div>
        </div>
        <div className="roster-grid">
          {characters.map((v) => (
            <button
              key={v.id}
              className={v.id === c.id ? "selected" : ""}
              onClick={() => {
                selectCharacter(v.id);
                sound("ui");
              }}
            >
              <span className="roster-head" style={{ background: v.color }}>
                <i />
                <i />
              </span>
              <b>{v.name}</b>
              {v.id === c.id && <Check size={13} />}
            </button>
          ))}
        </div>
        <button className="primary" onClick={() => setScreen("setup")}>
          THAT’S MY PLAYER <ArrowUpRight />
        </button>
      </section>
    </div>
  );
}
