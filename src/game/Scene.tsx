import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { RoundedBox, Float, Html } from "@react-three/drei";
import {
  BufferGeometryLoader,
  TextureLoader,
  SRGBColorSpace,
  Group,
  Mesh,
  Vector3,
  Object3D,
  InstancedMesh,
  Color,
  MeshStandardMaterial,
} from "three";
import { biomes, characters, pickupIcons } from "./definitions";
import { Game, type Actor, type Bomb, type Flame } from "./engine";
import { useStore, type Save } from "../store";
import {
  Tree,
  Water,
  TileDetails,
  WorldAtmosphere,
  ShockRing,
} from "./WorldDetails";

function Asset({
  name,
  position,
  scale = 1,
  rotation = 0,
}: {
  name: "tree" | "crate" | "barrel" | "rock";
  position: [number, number, number];
  scale?: number;
  rotation?: number;
}) {
  const geometry = useLoader(BufferGeometryLoader, `/assets/${name}.json`);
  const map = useLoader(
    TextureLoader,
    `/assets/${name === "tree" ? "foliage" : name === "rock" ? "rock" : "items"}.webp`,
  );
  map.colorSpace = SRGBColorSpace;
  return (
    <mesh
      geometry={geometry}
      position={position}
      scale={scale}
      rotation={[0, rotation, 0]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial map={map} roughness={0.85} />
    </mesh>
  );
}
function Block({
  position,
  size = [1, 1, 1],
  color,
  radius = 0.055,
  roughness = 0.85,
}: {
  position: [number, number, number];
  size?: [number, number, number];
  color: string;
  radius?: number;
  roughness?: number;
}) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(radius, ...size.map((v) => v * 0.48))}
      smoothness={1}
      position={position}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={roughness} />
    </RoundedBox>
  );
}
function Obstacle({
  x,
  z,
  biome,
}: {
  x: number;
  z: number;
  biome: (typeof biomes)[number];
}) {
  if (biome.id === "meadow" || biome.id === "ruins")
    return (
      <Asset
        name="crate"
        position={[x, 0, z]}
        rotation={(((x + z) % 2) * Math.PI) / 2}
      />
    );
  if (biome.id === "lava") return <Asset name="barrel" position={[x, 0, z]} />;
  const color =
    biome.id === "candy"
      ? "#92604f"
      : biome.id === "ice"
        ? "#a0cddc"
        : biome.id === "neon"
          ? "#647582"
          : "#8c9da5";
  return (
    <group>
      <Block
        position={[x, 0.38, z]}
        size={[0.81, 0.76, 0.81]}
        color={color}
        radius={0.07}
        roughness={biome.id === "ice" ? 0.25 : 0.6}
      />
      <Block
        position={[x, 0.57, z + 0.415]}
        size={[0.72, 0.075, 0.026]}
        color={biome.accent}
      />
      <Block
        position={[x, 0.18, z + 0.415]}
        size={[0.72, 0.075, 0.026]}
        color={biome.accent}
      />
      <Block
        position={[x, 0.38, z + 0.43]}
        size={[0.07, 0.65, 0.025]}
        color={biome.accent}
      />
      {biome.id === "candy" && (
        <mesh position={[x, 0.82, z]}>
          <sphereGeometry args={[0.095, 10, 8]} />
          <meshStandardMaterial color="#e89dac" />
        </mesh>
      )}
    </group>
  );
}
function StoneWall({
  x,
  z,
  biome,
}: {
  x: number;
  z: number;
  biome: (typeof biomes)[number];
}) {
  const geometry = useLoader(BufferGeometryLoader, "/assets/cube.json");
  const texture = useLoader(TextureLoader, "/assets/stone.webp");
  texture.colorSpace = SRGBColorSpace;
  return (
    <group>
      <mesh
        geometry={geometry}
        position={[x, 0, z]}
        scale={[0.87, 0.73, 0.87]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={
            biome.id === "meadow" || biome.id === "ruins" || biome.id === "lava"
              ? texture
              : undefined
          }
          color={biome.wall}
          roughness={0.85}
        />
      </mesh>
      <Block
        position={[x, 0.75, z]}
        size={[0.78, 0.07, 0.78]}
        color={biome.id === "ruins" ? biome.floor : biome.accent}
      />
    </group>
  );
}
export function Bomber({
  actor,
  save,
  preview = false,
}: {
  actor: Actor;
  save?: Save;
  preview?: boolean;
}) {
  const root = useRef<Group>(null),
    body = useRef<Group>(null),
    left = useRef<Group>(null),
    right = useRef<Group>(null);
  const c = characters.find((v) => v.id === actor.character)!;
  const color = save?.color ?? c.color,
    accent = save?.accent ?? c.accent;
  const boss = actor.name === "KING KABOOM";
  const settings = useStore((s) => s.save.settings);
  useFrame(({ clock }, delta) => {
    if (!root.current || !body.current) return;
    const hit =
      actor.hitFlash > 0 &&
      (settings.reducedMotion || Math.floor(actor.hitFlash * 14) % 2 === 0);
    const shield = actor.shieldFlash > 0;
    body.current.traverse((object) => {
      if (
        object instanceof Mesh &&
        object.material instanceof MeshStandardMaterial
      ) {
        object.material.emissive.set(
          hit ? "#ff092c" : shield ? "#0beed8" : "#000000",
        );
        object.material.emissiveIntensity = hit ? 1.8 : shield ? 0.6 : 0;
      }
    });
    const t = actor.move > 0 ? 1 - actor.move / actor.moveTime : 1;
    root.current.position.set(
      preview ? 0 : actor.fromX + (actor.x - actor.fromX) * t,
      preview
        ? 0
        : useStore.getState().game.elevation(actor.fromX, actor.fromZ) *
            (1 - t) +
            useStore.getState().game.elevation(actor.x, actor.z) * t,
      preview ? 0 : actor.fromZ + (actor.z - actor.fromZ) * t,
    );
    const target = preview
      ? settings.reducedMotion
        ? 0.25
        : clock.elapsedTime * 0.22
      : Math.PI - (actor.facing * Math.PI) / 2;
    root.current.rotation.y +=
      Math.atan2(
        Math.sin(target - root.current.rotation.y),
        Math.cos(target - root.current.rotation.y),
      ) * Math.min(1, delta * 12);
    const victory =
      useStore.getState().game.phase === "finished" &&
      useStore.getState().game.winner === actor.name;
    body.current.position.y = settings.reducedMotion
      ? 0
      : victory
        ? Math.abs(Math.sin(clock.elapsedTime * 6)) * 0.18
        : actor.move > 0
          ? Math.abs(Math.sin(clock.elapsedTime * 17)) * 0.08
          : Math.sin(clock.elapsedTime * 2.3 + actor.id) * 0.025;
    const targetScale = actor.alive ? 1 : 0.001;
    const squash =
      !settings.reducedMotion && actor.move > 0
        ? Math.sin(clock.elapsedTime * 17) * 0.035
        : 0;
    body.current.scale.lerp(
      new Vector3(
        targetScale * (1 - squash),
        targetScale * (1 + squash),
        targetScale * (1 - squash),
      ),
      Math.min(1, delta * 14),
    );
    if (left.current)
      left.current.rotation.x =
        actor.move > 0 ? Math.sin(clock.elapsedTime * 17) * 0.65 : 0;
    if (right.current)
      right.current.rotation.x =
        actor.move > 0 ? -Math.sin(clock.elapsedTime * 17) * 0.65 : 0;
  });
  return (
    <group ref={root} scale={boss ? 1.55 : 1}>
      <group ref={body}>
        <Block
          position={[0, 0.41, 0]}
          size={[0.46, 0.48, 0.34]}
          color={color}
          roughness={save?.finish === "gloss" ? 0.22 : 0.85}
        />
        <Block
          position={[0, 0.39, -0.18]}
          size={[0.3, 0.11, 0.07]}
          color={accent}
        />
        <Block
          position={[0, 0.83, 0]}
          size={[0.64, 0.53, 0.53]}
          color={color}
          radius={0.12}
          roughness={save?.finish === "gloss" ? 0.22 : 0.85}
        />
        <Block
          position={[0, 0.82, 0.255]}
          size={[0.47, 0.3, 0.06]}
          color="#f5eddb"
          radius={0.07}
        />
        {[-1, 1].map((i) => (
          <mesh
            key={i}
            position={[i * 0.105, 0.85, 0.296]}
            scale={[save?.eyes === "sharp" ? 0.055 : 0.036, 0.078, 0.025]}
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={save?.eyeColor ?? "#253139"} />
          </mesh>
        ))}
        <mesh position={[0, 1.18, 0]}>
          <sphereGeometry args={[0.077, 12, 8]} />
          <meshStandardMaterial color={accent} />
        </mesh>
        <mesh position={[0, 1.08, 0]}>
          <cylinderGeometry args={[0.024, 0.028, 0.12, 8]} />
          <meshStandardMaterial color="#263139" />
        </mesh>
        <group ref={left} position={[-0.18, 0.24, 0]}>
          <Block
            position={[0, -0.07, 0.045]}
            size={[0.21, 0.23, 0.29]}
            color="#263139"
          />
        </group>
        <group ref={right} position={[0.18, 0.24, 0]}>
          <Block
            position={[0, -0.07, 0.045]}
            size={[0.21, 0.23, 0.29]}
            color="#263139"
          />
        </group>
        {[-1, 1].map((i) => (
          <Block
            key={i}
            position={[i * 0.31, 0.48, 0.06]}
            size={[0.18, 0.22, 0.22]}
            color={accent}
            radius={0.08}
          />
        ))}
        {save?.pattern && (
          <Block
            position={[0, 0.48, 0.185]}
            size={[0.07, 0.28, 0.025]}
            color={accent}
          />
        )}
        {actor.character === "spark" &&
          [-1, 1].map((i) => (
            <mesh
              key={"wing" + i}
              position={[i * 0.34, 0.85, -0.04]}
              rotation={[0, 0, i * 0.4]}
            >
              <coneGeometry args={[0.1, 0.35, 3]} />
              <meshStandardMaterial color={accent} />
            </mesh>
          ))}
        {actor.character === "tanko" &&
          [-1, 1].map((i) => (
            <Block
              key={"armor" + i}
              position={[i * 0.3, 0.6, -0.015]}
              size={[0.24, 0.15, 0.39]}
              color="#435d73"
            />
          ))}
        {actor.character === "pixel" && (
          <Block
            position={[0, 0.98, 0.28]}
            size={[0.46, 0.075, 0.04]}
            color="#51376e"
          />
        )}
        {actor.character === "fuse" && (
          <group position={[0, 0.44, -0.24]}>
            {[-0.13, 0, 0.13].map((x) => (
              <mesh key={x} position={[x, 0, 0]}>
                <cylinderGeometry args={[0.065, 0.065, 0.39, 8]} />
                <meshStandardMaterial color="#a94835" />
              </mesh>
            ))}
            <Block
              position={[0, 0, -0.055]}
              size={[0.37, 0.07, 0.08]}
              color="#e5c08a"
            />
          </group>
        )}
        {actor.character === "ghosty" && (
          <mesh position={[0, 0.3, -0.23]} rotation={[0.15, 0, 0]}>
            <coneGeometry args={[0.25, 0.6, 5]} />
            <meshStandardMaterial color={accent} transparent opacity={0.7} />
          </mesh>
        )}
        {(save?.hat === "crown" || boss) && (
          <group position={[0, 1.11, 0]}>
            <Block
              position={[0, 0.015, 0]}
              size={[0.53, 0.09, 0.45]}
              color="#ffd263"
            />
            {[-0.2, 0, 0.2].map((x) => (
              <mesh key={x} position={[x, 0.1, 0.17]}>
                <coneGeometry args={[0.09, 0.2, 4]} />
                <meshStandardMaterial
                  color="#ffd263"
                  metalness={0.6}
                  roughness={0.3}
                />
              </mesh>
            ))}
          </group>
        )}
        {save?.hat === "headphones" && (
          <group>
            <mesh position={[0, 1.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.31, 0.035, 6, 18, Math.PI]} />
              <meshStandardMaterial color="#24292f" />
            </mesh>
            {[-1, 1].map((i) => (
              <Block
                key={i}
                position={[i * 0.34, 0.9, 0]}
                size={[0.1, 0.2, 0.19]}
                color={accent}
              />
            ))}
          </group>
        )}
        {save?.outfit === "scarf" && (
          <group>
            <Block
              position={[0, 0.59, 0]}
              size={[0.51, 0.09, 0.37]}
              color="#b8243b"
            />
            <Block
              position={[0.19, 0.43, -0.21]}
              size={[0.13, 0.35, 0.06]}
              color="#b8243b"
            />
          </group>
        )}
        {actor.shield > 0 && (
          <mesh position={[0, 0.64, 0]}>
            <sphereGeometry args={[0.72, 20, 14]} />
            <meshStandardMaterial
              color="#9efbe3"
              transparent
              opacity={0.2}
              wireframe
            />
          </mesh>
        )}
        {!preview && actor.id === 0 && (
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.42, 32]} />
            <meshBasicMaterial color="#fff4ba" />
          </mesh>
        )}
        {save?.trail && (actor.move > 0 || preview) && (
          <mesh position={[0, 0.1, -0.45]}>
            <octahedronGeometry args={[0.08]} />
            <meshBasicMaterial color={accent} />
          </mesh>
        )}
      </group>
    </group>
  );
}
export function BombMesh({ bomb, skin }: { bomb: Bomb; skin: string }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const game = useStore.getState().game;
      let x = bomb.x,
        z = bomb.z,
        y = game.elevation(x, z) + 0.29;
      if (bomb.heldBy !== undefined) {
        const a = game.actors.find((a) => a.id === bomb.heldBy);
        if (a) {
          const t = a.move > 0 ? 1 - a.move / a.moveTime : 1;
          x = a.fromX + (a.x - a.fromX) * t;
          z = a.fromZ + (a.z - a.fromZ) * t;
          y =
            game.elevation(a.fromX, a.fromZ) * (1 - t) +
            game.elevation(a.x, a.z) * t +
            1.6;
        }
      }
      if (bomb.flight) {
        const t = 1 - bomb.flight.time / bomb.flight.duration;
        x = bomb.flight.x + (bomb.x - bomb.flight.x) * t;
        z = bomb.flight.z + (bomb.z - bomb.flight.z) * t;
        y =
          game.elevation(bomb.flight.x, bomb.flight.z) * (1 - t) +
          game.elevation(bomb.x, bomb.z) * t +
          0.29 +
          Math.sin(t * Math.PI) * 2.2;
      }
      ref.current.position.set(x, y, z);
      const pulse =
        1 + Math.sin(clock.elapsedTime * (bomb.fuse < 1 ? 24 : 7)) * 0.07;
      ref.current.scale.setScalar(pulse);
      ref.current.rotation.y = clock.elapsedTime * 0.25;
    }
  });
  const color =
    bomb.kind === "ice"
      ? "#77bfd4"
      : bomb.kind === "fire"
        ? "#df622e"
        : bomb.kind === "shock"
          ? "#9372bc"
          : bomb.kind === "wind"
            ? "#80bca1"
            : bomb.kind === "smoke"
              ? "#778290"
              : bomb.kind === "remote"
                ? "#bd5748"
                : skin === "metal"
                  ? "#b5c4c9"
                  : "#26313b";
  return (
    <group ref={ref} position={[bomb.x, 0.29, bomb.z]}>
      <mesh castShadow>
        <sphereGeometry args={[bomb.kind === "mega" ? 0.37 : 0.28, 18, 14]} />
        <meshStandardMaterial
          color={bomb.fuse < 0.45 ? "#ed8d56" : color}
          roughness={skin === "metal" ? 0.22 : 0.4}
          metalness={skin === "metal" ? 0.8 : 0.3}
        />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.13, 8]} />
        <meshStandardMaterial color="#d5ae70" />
      </mesh>
      <mesh position={[0.035, 0.39, 0]}>
        <sphereGeometry args={[0.037, 8, 6]} />
        <meshBasicMaterial color="#ffe18e" />
      </mesh>
      {bomb.kind !== "standard" && (
        <Html position={[0, 0.25, 0.23]} center distanceFactor={16}>
          <span className="bomb-glyph">{pickupIcons[bomb.kind]}</span>
        </Html>
      )}
    </group>
  );
}
function FlameMesh({ flame }: { flame: Flame }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.scale.y =
        0.7 + Math.sin(clock.elapsedTime * 19 + flame.id) * 0.25;
    }
  });
  const color =
    flame.kind === "ice"
      ? "#bbeeff"
      : flame.kind === "shock"
        ? "#c4afff"
        : flame.kind === "smoke"
          ? "#7c8992"
          : flame.kind === "wind"
            ? "#c0ffe2"
            : "#ffd166";
  return (
    <group ref={ref} position={[flame.x, 0.12, flame.z]}>
      <mesh>
        <boxGeometry args={[0.88, 0.23, 0.88]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={flame.kind === "smoke" ? 0.2 : 0.85}
        />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.075, 0]}>
        <ringGeometry args={[0.29, 0.43, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
function Floor({
  game,
  biome,
}: {
  game: Game;
  biome: (typeof biomes)[number];
}) {
  const sides = useRef<InstancedMesh>(null),
    tops = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useEffect(() => {
    game.tiles.forEach((t, i) => {
      const y = game.elevation(t.x, t.z),
        height = y + 1.1;
      dummy.position.set(t.x, y - height / 2 - 0.055, t.z);
      dummy.scale.set(0.99, height, 0.99);
      dummy.updateMatrix();
      sides.current?.setMatrixAt(i, dummy.matrix);
      sides.current?.setColorAt(
        i,
        new Color(
          t.level === 0 ? biome.side : t.level === 1 ? "#394c80" : "#493e76",
        ),
      );
      dummy.position.set(t.x, y - 0.045, t.z);
      dummy.scale.set(0.98, 0.09, 0.98);
      dummy.updateMatrix();
      tops.current?.setMatrixAt(i, dummy.matrix);
      const color = new Color(biome.floor);
      color.offsetHSL(0, (i % 3) * 0.035, (i % 2) * 0.035);
      tops.current?.setColorAt(i, color);
    });
    for (const mesh of [sides.current, tops.current])
      if (mesh) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
  }, [game, biome, dummy]);
  return (
    <group>
      <instancedMesh
        ref={sides}
        args={[undefined, undefined, game.tiles.length]}
        receiveShadow
        castShadow
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh
        ref={tops}
        args={[undefined, undefined, game.tiles.length]}
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.65} />
      </instancedMesh>
      {game.tiles
        .filter((t) => t.stair || t.water)
        .map((t) => (
          <TileDetails key={t.x + "," + t.z} tile={t} game={game} />
        ))}
      <WorldAtmosphere game={game} />
    </group>
  );
}
function Decoration({
  game,
  biome,
}: {
  game: Game;
  biome: (typeof biomes)[number];
}) {
  const positions: [number, number][] = [
    [-2, 2],
    [-2, game.height - 3],
    [game.width + 1, 2],
    [game.width + 1, game.height - 3],
    [2, -2],
    [game.width - 3, game.height + 1],
  ];
  return (
    <group>
      {positions.map(([x, z], i) => (
        <group
          key={i}
          position={[
            0,
            game.elevation(
              Math.max(1, Math.min(game.width - 2, x)),
              Math.max(1, Math.min(game.height - 2, z)),
            ),
            0,
          ]}
        >
          <Block
            position={[x, -0.6, z]}
            size={[2.25, 1.25, 2.25]}
            color={biome.side}
          />
          <Block
            position={[x, 0.06, z]}
            size={[2.3, 0.15, 2.3]}
            color={biome.floor}
          />
          {biome.prop === "tree" || biome.prop === "ruins" ? (
            <Tree
              x={x}
              z={z}
              seed={i}
              color={biome.prop === "ruins" ? "#399b82" : "#3ac876"}
            />
          ) : biome.prop === "candy" ? (
            <group position={[x, 1.3, z]}>
              <mesh castShadow>
                <sphereGeometry args={[0.6, 12, 8]} />
                <meshStandardMaterial color={i % 2 ? "#e8a2c4" : "#f2cf78"} />
              </mesh>
              <mesh position={[0, -0.6, 0]}>
                <cylinderGeometry args={[0.07, 0.07, 1.4, 8]} />
                <meshStandardMaterial color="#fff2df" />
              </mesh>
            </group>
          ) : biome.prop === "city" ? (
            <group>
              <Block position={[x, 1, z]} size={[1, 2, 1]} color="#4b5666" />
              <Block
                position={[x, 1.3, z + 0.51]}
                size={[0.65, 0.15, 0.03]}
                color="#d8829a"
              />
            </group>
          ) : biome.prop === "space" ? (
            <group>
              <mesh position={[x, 1, z]}>
                <cylinderGeometry args={[0.1, 0.3, 2, 8]} />
                <meshStandardMaterial
                  color="#d0d9df"
                  metalness={0.7}
                  roughness={0.25}
                />
              </mesh>
              <mesh position={[x, 1.5, z]} rotation={[Math.PI / 3, 0, 0]}>
                <torusGeometry args={[0.65, 0.07, 8, 24]} />
                <meshStandardMaterial
                  color={biome.accent}
                  emissive={biome.accent}
                  emissiveIntensity={0.3}
                />
              </mesh>
            </group>
          ) : (
            <group>
              {[0, 1, 2].map((j) => (
                <mesh
                  key={j}
                  position={[x + (j - 1) * 0.3, 0.55 + j * 0.15, z]}
                  rotation={[0, j, 0.15]}
                  castShadow
                >
                  <coneGeometry args={[0.25, 0.9 + j * 0.3, 5]} />
                  <meshStandardMaterial
                    color={biome.prop === "lava" ? "#e4a851" : "#b2e5f2"}
                    roughness={0.3}
                  />
                </mesh>
              ))}
            </group>
          )}
          <Asset
            name="rock"
            position={[x - 0.65, 0.13, z + 0.6]}
            scale={0.45}
          />
        </group>
      ))}
      {[-2, game.width + 1].map((x, i) => (
        <group key={"stream" + i} position={[x, -0.25, (game.height - 1) / 2]}>
          <Block
            position={[0, -0.3, 0]}
            size={[2.3, 0.7, game.height - 5]}
            color={biome.side}
          />
          <Water position={[0, 0.065, 0]} size={[2.25, game.height - 5.1]} />
          {[-1, 0, 1].map((j) => (
            <group key={j}>
              <Block
                position={[j * 0.35, 0.15, j * 0.85]}
                size={[0.58, 0.3, 0.58]}
                color={biome.wall}
              />
              <mesh
                position={[j * 0.35, 0.305, j * 0.85]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[0.5, 0.5]} />
                <meshStandardMaterial color={biome.floor} />
              </mesh>
            </group>
          ))}
          {[-0.8, 0.8].map((v) => (
            <Block
              key={v}
              position={[v, 0.045, 0]}
              size={[0.17, 0.15, game.height - 5]}
              color={biome.accent}
            />
          ))}
        </group>
      ))}
      {[1, game.width - 2].flatMap((x) =>
        [2, game.height - 3].map((z) => (
          <group
            key={"fence" + x + "," + z}
            position={[x, 0.17, z === 2 ? -1 : game.height]}
          >
            {[-0.36, 0.36].map((dx) => (
              <Block
                key={dx}
                position={[dx, 0.24, 0]}
                size={[0.08, 0.48, 0.08]}
                color="#a47b4d"
              />
            ))}
            <Block
              position={[0, 0.33, 0]}
              size={[0.82, 0.07, 0.07]}
              color="#c5a267"
            />
            <Block
              position={[0, 0.12, 0]}
              size={[0.82, 0.07, 0.07]}
              color="#c5a267"
            />
          </group>
        )),
      )}
      {positions.slice(0, 4).map(([x, z], i) => (
        <group
          key={"bridge" + i}
          position={[x < 0 ? -0.65 : game.width - 0.35, 0.05, z]}
        >
          {[0, 1, 2].map((j) => (
            <Block
              key={j}
              position={[j * 0.28 - 0.28, 0, 0]}
              size={[0.22, 0.11, 1.3]}
              color="#be925b"
            />
          ))}
        </group>
      ))}
    </group>
  );
}
function Arena({ game, menu }: { game: Game; menu: boolean }) {
  const save = useStore((s) => s.save);
  const biome = biomes.find((b) => b.id === game.config.biome) ?? biomes[0];
  const [, setRevision] = useState(0);
  const last = useRef(0);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current > 0.05) {
      last.current = clock.elapsedTime;
      setRevision((v) => v + 1);
    }
  });
  return (
    <group position={[-(game.width - 1) / 2, 0, -(game.height - 1) / 2]}>
      <Block
        position={[(game.width - 1) / 2, -0.9, (game.height - 1) / 2]}
        size={[game.width, 1.5, game.height]}
        color={biome.side}
        radius={0.15}
      />
      <Floor game={game} biome={biome} />
      <Decoration game={game} biome={biome} />
      {game.tiles
        .filter((t) => t.kind === "wall")
        .map((t) => (
          <group
            key={t.x + "," + t.z}
            position={[0, game.elevation(t.x, t.z), 0]}
          >
            {t.x === 0 ||
            t.z === 0 ||
            t.x === game.width - 1 ||
            t.z === game.height - 1 ? (
              <Block
                position={[t.x, 0.13, t.z]}
                size={[0.96, 0.26, 0.96]}
                color={biome.accent}
              />
            ) : (
              <StoneWall x={t.x} z={t.z} biome={biome} />
            )}
          </group>
        ))}
      {game.tiles
        .filter((t) => t.kind === "crate")
        .map((t) => (
          <group
            key={t.x + "," + t.z}
            position={[0, game.elevation(t.x, t.z), 0]}
          >
            <Obstacle x={t.x} z={t.z} biome={biome} />
          </group>
        ))}
      {game.tiles
        .filter((t) => t.hazard && t.kind === "floor")
        .map((t) => (
          <mesh
            key={t.x + "," + t.z}
            position={[t.x, game.elevation(t.x, t.z) + 0.009, t.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.85, 0.85]} />
            <meshStandardMaterial
              color={
                game.unsafe(t.x, t.z) || game.hazardActive(t)
                  ? "#e47d49"
                  : biome.prop === "ice"
                    ? "#d9faff"
                    : biome.prop === "space"
                      ? "#7be2d7"
                      : biome.prop === "lava"
                        ? "#bc985e"
                        : biome.floor
              }
              emissive={game.hazardActive(t) ? "#bd4319" : "#000000"}
              roughness={0.3}
            />
          </mesh>
        ))}
      {biome.id === "lava" &&
        game.tiles
          .filter((t) => t.hazard && t.kind === "floor")
          .map((t) => (
            <Html
              key={"hazard" + t.x + "," + t.z}
              position={[t.x, game.elevation(t.x, t.z) + 0.09, t.z]}
              center
            >
              <span
                className={
                  "hazard-glyph " + (game.time % 8 >= 4 ? "armed" : "")
                }
              >
                ⚠
              </span>
            </Html>
          ))}
      {game.shrink > 0 &&
        game.tiles
          .filter((t) => game.unsafe(t.x, t.z) && t.kind !== "wall")
          .map((t) => (
            <mesh
              key={"s" + t.x + "," + t.z}
              position={[t.x, game.elevation(t.x, t.z) + 0.05, t.z]}
            >
              <boxGeometry args={[0.95, 0.1, 0.95]} />
              <meshBasicMaterial color="#e26547" />
            </mesh>
          ))}
      {game.actors.map((a) => (
        <group key={a.id}>
          <Bomber actor={a} save={a.id === 0 ? save : undefined} />
          {a.alive &&
            !menu &&
            (a.id === 0 ||
              !game.flames.some(
                (f) => f.kind === "smoke" && f.x === a.x && f.z === a.z,
              )) && (
              <Html
                position={[
                  a.x,
                  game.elevation(a.x, a.z) +
                    (a.name === "KING KABOOM" ? 2.4 : 1.5),
                  a.z,
                ]}
                center
              >
                <div className={"actor-label " + (a.id === 0 ? "you" : "")}>
                  {a.id === 0 ? "▼ YOU" : a.name}
                  {save.settings.colorblind && ` #${a.id + 1}`}
                </div>
              </Html>
            )}
        </group>
      ))}
      {game.bombs.map((b) => (
        <BombMesh
          key={b.id}
          bomb={b}
          skin={b.owner === 0 ? save.bombSkin : "classic"}
        />
      ))}
      {game.flames.map((f) => (
        <group key={f.id} position={[0, game.elevation(f.x, f.z), 0]}>
          <FlameMesh flame={f} />
        </group>
      ))}
      {game.pickups.map((p) => (
        <Float
          key={p.id}
          speed={save.settings.reducedMotion ? 0 : 3}
          floatIntensity={save.settings.reducedMotion ? 0 : 0.15}
          rotationIntensity={0}
        >
          <group position={[p.x, game.elevation(p.x, p.z) + 0.35, p.z]}>
            <mesh rotation={[0, Math.PI / 4, 0]}>
              <boxGeometry args={[0.36, 0.36, 0.36]} />
              <meshStandardMaterial
                color={p.kind === "curse" ? "#bc7bce" : "#f4d583"}
                emissive="#aa7925"
                emissiveIntensity={0.1}
              />
            </mesh>
            <Html center position={[0, 0.02, 0.2]} distanceFactor={14}>
              <b className="pickup-glyph">{pickupIcons[p.kind] ?? "+"}</b>
            </Html>
          </group>
        </Float>
      ))}
      {save.settings.particles &&
        game.bursts.map((b) => (
          <group
            key={b.id}
            position={[b.x, game.elevation(b.x, b.z) + 0.3, b.z]}
          >
            <ShockRing time={b.time} color={b.color} />
            {Array.from(
              { length: save.settings.quality === "low" ? 5 : 12 },
              (_, i) => (
                <mesh
                  key={i}
                  position={[
                    Math.sin(i * 2.4) * (1 - b.time) * 1.2,
                    0.1 + Math.abs(Math.cos(i * 3)) * (1 - b.time) * 1.4,
                    Math.cos(i * 2.4) * (1 - b.time) * 1.2,
                  ]}
                  scale={Math.max(0.01, b.time * 0.15)}
                >
                  <icosahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial
                    color={b.color}
                    transparent
                    opacity={Math.min(1, b.time * 2)}
                  />
                </mesh>
              ),
            )}
          </group>
        ))}
    </group>
  );
}
function CameraRig({ game, menu }: { game: Game; menu: boolean }) {
  const { camera, size } = useThree();
  const settings = useStore((s) => s.save.settings);
  useFrame(({ clock }, dt) => {
    const span = Math.max(game.width, game.height),
      ratio = Math.max(1, 1.45 / (size.width / size.height));
    const distance = span * 1.32 * ratio;
    const shake = settings.reducedMotion
      ? 0
      : game.bursts.length
        ? Math.sin(clock.elapsedTime * 41) * 0.12 * settings.shake * game.impact
        : 0;
    const winner =
      game.phase === "finished"
        ? game.actors.find((a) => a.name === game.winner)
        : undefined;
    const aim = new Vector3(
      winner ? (winner.x - (game.width - 1) / 2) * 0.3 : 0,
      game.config.floors > 1 ? 1 : -0.15,
      winner ? (winner.z - (game.height - 1) / 2) * 0.3 : 0,
    );
    const pos = new Vector3(
      distance * 0.8 + shake,
      distance * 0.96,
      distance * 0.9,
    );
    camera.position.lerp(pos, Math.min(1, dt * 3));
    camera.lookAt(aim);
    if (menu && !settings.reducedMotion)
      camera.position.x += Math.sin(clock.elapsedTime * 0.12) * 0.005;
  });
  return null;
}
export function World({ preview = false }: { preview?: boolean }) {
  const game = useStore((s) => s.game),
    screen = useStore((s) => s.screen),
    save = useStore((s) => s.save);
  const menu = screen !== "match";
  const previewActor = useMemo(
    () => new Game({ ...defaultPreview }, save.character).player,
    [save.character],
  );
  const biome = biomes.find((b) => b.id === game.config.biome) ?? biomes[0];
  return (
    <Canvas
      shadows={save.settings.quality === "high"}
      dpr={Math.max(
        0.5,
        Math.min(window.devicePixelRatio, 1.5) * save.settings.scale,
      )}
      camera={{ position: [16, 18, 18], fov: 38, near: 0.1, far: 150 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={biome.id === "neon" ? 0.55 : 1.15} />
      <hemisphereLight args={["#fff2da", "#82918b", 1.3]} />
      <directionalLight
        color={
          biome.id === "lava"
            ? "#ffd2a1"
            : biome.id === "ice"
              ? "#d5edff"
              : biome.id === "candy"
                ? "#ffe2ea"
                : biome.id === "neon"
                  ? "#c0c6ff"
                  : biome.id === "space"
                    ? "#c5fff8"
                    : "#fff2d8"
        }
        position={[-6, 15, 8]}
        intensity={2.6}
        castShadow
        shadow-mapSize={save.settings.quality === "high" ? 2048 : 512}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-normalBias={0.03}
      />
      <Suspense fallback={null}>
        {preview ? (
          <>
            <group position={[0, -1.2, 0]} scale={2.1}>
              <Bomber actor={previewActor} save={save} preview />
            </group>
            <PreviewCamera />
          </>
        ) : (
          <>
            <Arena game={game} menu={menu} />
            <CameraRig game={game} menu={menu} />
            <fog attach="fog" args={[biome.sky, 42, 100]} />
          </>
        )}
      </Suspense>
    </Canvas>
  );
}
const defaultPreview = {
  mode: "classic" as const,
  biome: "meadow",
  seed: "preview",
  size: "small" as const,
  width: 11,
  height: 11,
  difficulty: "normal" as const,
  bots: 1,
  duration: 120,
  density: 0.3,
  drops: 0.5,
  hazards: false,
  specialBombs: true,
  abilities: true,
  capacity: 2,
  range: 2,
  floors: 1,
  water: false,
};
function PreviewCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(3, 2.5, 5);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}
