import { useState } from "react";
import { ArrowUpRight, Bomb, Coins, Check, Sparkles } from "lucide-react";
import { useStore } from "../store";
import { cosmetics } from "../game/definitions";
import { Bomber, BombMesh } from "../game/Scene";
import { Canvas } from "@react-three/fiber";
export default function Shop() {
  const { save, purchase, equip } = useStore();
  const [filter, setFilter] = useState("all"),
    [confirm, setConfirm] = useState<string | null>(null),
    [preview, setPreview] = useState("crown");
  const item = cosmetics.find((c) => c.id === preview)!;
  const equipped = (id: string) =>
    [save.hat, save.outfit, save.bombSkin].includes(id) ||
    (id === "trail" && save.trail);
  const previewSave = {
    ...save,
    ...(item.category === "headwear"
      ? { hat: item.id }
      : item.category === "outfit"
        ? { outfit: item.id }
        : item.category === "effect"
          ? { trail: true }
          : { bombSkin: item.id }),
  };
  return (
    <>
      <div className="shop-top">
        <p>Good looks. Earned in the arena.</p>
        <div className="shop-balance">
          <Coins size={22} />
          <b>{save.coins}</b> BOOM COINS
        </div>
      </div>
      <div className="tab-row">
        {["all", "headwear", "outfit", "bomb", "effect"].map((v) => (
          <button
            key={v}
            className={filter === v ? "selected" : ""}
            onClick={() => setFilter(v)}
          >
            {v === "all" ? "EVERYTHING" : v.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="shop-layout">
        <div className="shop-grid">
          {cosmetics
            .filter((c) => filter === "all" || c.category === filter)
            .map((c) => (
              <button
                className={"shop-card " + (preview === c.id ? "selected" : "")}
                key={c.id}
                onClick={() => setPreview(c.id)}
              >
                <span className="shop-art">
                  {c.id === "crown" ? (
                    "♛"
                  ) : c.id === "headphones" ? (
                    "◉"
                  ) : c.id === "scarf" ? (
                    "〰"
                  ) : c.id === "metal" ? (
                    <Bomb size={52} />
                  ) : (
                    <Sparkles size={52} />
                  )}
                </span>
                <small>{c.category.toUpperCase()}</small>
                <b>{c.name}</b>
                <div>
                  {save.owned.includes(c.id) ? (
                    <span>
                      <Check size={14} />{" "}
                      {equipped(c.id) ? "EQUIPPED" : "OWNED"}
                    </span>
                  ) : (
                    <span>
                      <Coins size={14} /> {c.price}
                    </span>
                  )}
                  <ArrowUpRight size={16} />
                </div>
              </button>
            ))}
        </div>
        <aside className="shop-detail">
          <div className="shop-preview">
            <CosmeticPreview
              save={previewSave}
              bomb={item.category === "bomb"}
            />
            {item.category === "bomb" && (
              <div className="chrome-preview">
                <Bomb size={64} />
              </div>
            )}
          </div>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
          <button
            className="primary"
            disabled={!save.owned.includes(item.id) && save.coins < item.price}
            onClick={() =>
              save.owned.includes(item.id)
                ? (equip(item.id), useStore.getState().notify("Look equipped"))
                : setConfirm(item.id)
            }
          >
            {save.owned.includes(item.id)
              ? equipped(item.id)
                ? "EQUIPPED"
                : "EQUIP LOOK"
              : save.coins < item.price
                ? "MORE COINS NEEDED"
                : `UNLOCK · ${item.price} COINS`}{" "}
            <ArrowUpRight size={19} />
          </button>
          <small>Cosmetic only. Your skill does the rest.</small>
        </aside>
      </div>
      {confirm && (
        <div className="modal-backdrop">
          <div className="dialog compact">
            <span className="eyebrow">A LITTLE RETAIL THERAPY</span>
            <h2>Make it yours?</h2>
            <p>
              Unlock {cosmetics.find((c) => c.id === confirm)!.name} for{" "}
              {cosmetics.find((c) => c.id === confirm)!.price} Boom Coins.
            </p>
            <button
              className="primary"
              onClick={() => {
                purchase(confirm);
                setConfirm(null);
              }}
            >
              CONFIRM PURCHASE <Check />
            </button>
            <button className="secondary" onClick={() => setConfirm(null)}>
              MAYBE LATER
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CosmeticPreview({
  save,
  bomb,
}: {
  save: ReturnType<typeof useStore.getState>["save"];
  bomb: boolean;
}) {
  // Render a separate preview without mutating the persisted appearance.
  return <PreviewWithSave save={save} bomb={bomb} />;
}

function PreviewWithSave({
  save,
  bomb,
}: {
  save: ReturnType<typeof useStore.getState>["save"];
  bomb: boolean;
}) {
  const actor = useStore((s) => s.game.player);
  return (
    <Canvas camera={{ position: [2.5, 1.8, 4], fov: 32 }}>
      <ambientLight intensity={2} />
      <directionalLight position={[3, 6, 3]} intensity={3} />
      <group position={[0, bomb ? -0.55 : -1, 0]} scale={bomb ? 1 : 1.8}>
        {bomb ? (
          <group scale={2.4}>
            <BombMesh
              bomb={{
                id: 0,
                owner: 0,
                x: 0,
                z: 0,
                kind: "standard",
                range: 2,
                fuse: 2.5,
                age: 0,
                pass: true,
                tick: 0,
              }}
              skin={save.bombSkin}
            />
          </group>
        ) : (
          <Bomber
            actor={{
              ...actor,
              alive: true,
              character: save.character,
              move: 0,
            }}
            save={save}
            preview
          />
        )}
      </group>
    </Canvas>
  );
}
