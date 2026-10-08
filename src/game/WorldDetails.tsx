import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { Group, ShaderMaterial, DoubleSide } from "three";
import type { Game } from "./engine";
import type { Tile } from "./grid";
import { useStore } from "../store";

// Broad silhouettes, small trunks and a restrained sway keep trees readable.
export function Tree({
  x,
  z,
  color = "#42ca69",
  seed = 0,
}: {
  x: number;
  z: number;
  color?: string;
  seed?: number;
}) {
  const crown = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (crown.current && !useStore.getState().save.settings.reducedMotion)
      crown.current.rotation.z =
        Math.sin(clock.elapsedTime * 1.2 + seed) * 0.045;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.22, 1.45, 7]} />
        <meshStandardMaterial color="#704029" roughness={0.9} />
      </mesh>
      <group ref={crown} position={[0, 1.1, 0]}>
        {[
          [0, 0.75, 0, 0.8],
          [-0.48, 0.32, 0.02, 0.62],
          [0.46, 0.42, 0.13, 0.65],
          [0.02, 0.35, -0.4, 0.62],
          [0.05, 1.2, 0, 0.56],
        ].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} scale={[1, 1.12, 1]} castShadow>
            <icosahedronGeometry args={[r, 1]} />
            <meshStandardMaterial
              color={i % 2 ? color : "#8dea58"}
              roughness={0.8}
              flatShading
            />
          </mesh>
        ))}
        <mesh position={[0.3, 0.55, 0.55]}>
          <sphereGeometry args={[0.095, 8, 6]} />
          <meshStandardMaterial color="#ff7152" />
        </mesh>
      </group>
      {[-1, 1].map((i) => (
        <mesh
          key={i}
          position={[i * 0.42, 0.1, 0.4]}
          rotation={[0, 0, i * 0.4]}
        >
          <coneGeometry args={[0.15, 0.35, 5]} />
          <meshStandardMaterial color="#64d761" />
        </mesh>
      ))}
    </group>
  );
}

export function Water({
  position,
  size,
  fall = false,
}: {
  position: [number, number, number];
  size: [number, number];
  fall?: boolean;
}) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: DoubleSide,
        transparent: true,
        uniforms: { uTime: { value: 0 }, uFall: { value: fall ? 1 : 0 } },
        vertexShader: `varying vec2 vUv; uniform float uTime; uniform float uFall; void main(){vUv=uv; vec3 p=position; p.z += sin(p.x*8.+uTime*2.)*cos(p.y*5.+uTime)*.016*(1.-uFall); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uFall; void main(){ float wave=sin(vUv.x*32.+uTime*1.8)*cos(vUv.y*26.-uTime*2.); float streak=pow(max(0.,sin(vUv.x*46.+sin(vUv.y*15.-uTime*4.))),8.); vec3 c=mix(vec3(.01,.36,.63),vec3(.08,.83,.94),.5+wave*.22); c+=vec3(.35,.72,.75)*streak*.28; float edge=smoothstep(.03,.07,vUv.x)*smoothstep(.03,.07,1.-vUv.x); c=mix(vec3(.63,1.,.98),c,edge); gl_FragColor=vec4(c,.94); }`,
      }),
    [fall],
  );
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = useStore.getState().save.settings
      .reducedMotion
      ? 0
      : clock.elapsedTime;
  });
  return (
    <mesh
      position={position}
      rotation={fall ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
      material={material}
    >
      <planeGeometry args={[...size, 8, 8]} />
    </mesh>
  );
}

export function TileDetails({ tile: t, game }: { tile: Tile; game: Game }) {
  const y = game.elevation(t.x, t.z);
  return (
    <group>
      {t.water && (
        <>
          <Water position={[t.x, y + 0.012, t.z]} size={[0.99, 0.99]} />
          {t.bridge && (
            <group position={[t.x, y + 0.055, t.z]}>
              {[-2, -1, 0, 1, 2].map((i) => (
                <mesh key={i} position={[i * 0.19, 0, 0]} castShadow>
                  <boxGeometry args={[0.16, 0.09, 0.94]} />
                  <meshStandardMaterial color={i % 2 ? "#c99655" : "#e0b56f"} />
                </mesh>
              ))}
            </group>
          )}
        </>
      )}
      {t.stair && game.tile(t.x, t.z + 1)?.level === t.level + 1 && (
        <group position={[t.x, y, t.z]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[0, (0.3 + i * 0.3) / 2, -0.4 + i * 0.2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.94, 0.3 + i * 0.3, 0.2]} />
              <meshStandardMaterial color={i % 2 ? "#ffc756" : "#ffe798"} />
            </mesh>
          ))}
          {[-0.48, 0.48].map((x) => (
            <mesh key={x} position={[x, 0.8, 0]} rotation={[0.95, 0, 0]}>
              <boxGeometry args={[0.055, 1.75, 0.055]} />
              <meshStandardMaterial
                color="#a6ffec"
                emissive="#35bd9d"
                emissiveIntensity={0.35}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export function WorldAtmosphere({ game }: { game: Game }) {
  const reduced = useStore((s) => s.save.settings.reducedMotion);
  const particles = useStore((s) => s.save.settings.particles);
  return (
    <group>
      {particles && !reduced && (
        <Sparkles
          count={35}
          scale={[game.width + 6, 5, game.height + 6]}
          position={[(game.width - 1) / 2, 2, (game.height - 1) / 2]}
          speed={0.3}
          size={2.5}
          color="#ffe49a"
          opacity={0.75}
        />
      )}
      {game.config.water && (
        <>
          {game.tiles
            .filter(
              (t) => t.water && game.tile(t.x, t.z + 1)?.level === t.level + 1,
            )
            .map((t) => (
              <Water
                key={t.x + "," + t.z}
                position={[t.x, game.elevation(t.x, t.z) + 0.75, t.z + 0.495]}
                size={[0.94, 1.5]}
                fall
              />
            ))}
          <Water position={[3, -1.25, 0.48]} size={[0.9, 2.7]} fall />
          <Water
            position={[game.width + 1, -1.8, game.height - 3]}
            size={[1.9, 3.3]}
            fall
          />
          <Water
            position={[game.width + 1, -3.42, game.height - 2.5]}
            size={[3.2, 2.5]}
          />
        </>
      )}
      {game.warnings.map((w, i) => (
        <mesh
          key={`${w.x},${w.z},${i}`}
          position={[w.x, game.elevation(w.x, w.z) + 0.055, w.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.92, 0.92]} />
          <meshBasicMaterial
            color={w.kind === "stomp" ? "#ff4769" : "#ffc52b"}
            transparent
            opacity={0.45 + (1.1 - w.time) * 0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

export function ShockRing({ time, color }: { time: number; color: string }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      scale={Math.max(0.01, (1 - time) * 2.4)}
    >
      <ringGeometry args={[0.7, 0.83, 24]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={Math.min(0.8, time)}
        side={DoubleSide}
      />
    </mesh>
  );
}
