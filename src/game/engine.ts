import {
  characters,
  type BombKind,
  type MatchConfig,
  type PickupKind,
} from "./definitions";
import { astar, directions, generate, key, random, type Tile } from "./grid";
import { sound } from "./audio";
export interface Actor {
  id: number;
  name: string;
  character: string;
  x: number;
  z: number;
  fromX: number;
  fromZ: number;
  move: number;
  moveTime: number;
  facing: number;
  alive: boolean;
  hp: number;
  shield: number;
  capacity: number;
  range: number;
  speed: number;
  kind: BombKind;
  arsenal: BombKind[];
  holding?: number;
  hitFlash: number;
  shieldFlash: number;
  cooldown: number;
  effect: number;
  invulnerable: number;
  stun: number;
  curse: number;
  kick: boolean;
  throw: boolean;
  score: number;
  respawn: number;
  think: number;
  personality: "human" | "aggressive" | "collector" | "trickster" | "defensive";
}
export interface Bomb {
  id: number;
  owner: number;
  x: number;
  z: number;
  kind: BombKind;
  range: number;
  fuse: number;
  age: number;
  pass: boolean;
  tick: number;
  target?: number;
  velocity?: readonly [number, number];
  slide?: number;
  heldBy?: number;
  flight?: { x: number; z: number; time: number; duration: number };
}
export interface Flame {
  id: number;
  x: number;
  z: number;
  time: number;
  owner: number;
  kind: BombKind;
  hit: Set<number>;
  originX?: number;
  originZ?: number;
}
export interface Pickup {
  id: number;
  x: number;
  z: number;
  kind: PickupKind;
}
export interface Burst {
  id: number;
  x: number;
  z: number;
  time: number;
  color: string;
}
export interface MatchStats {
  bombs: number;
  blocks: number;
  pickups: number;
  kills: number;
  chains: number;
  abilities: number;
  steps: number;
  hits: number;
}
export type GamePhase = "intro" | "playing" | "paused" | "finished";
export class Game {
  config: MatchConfig;
  width: number;
  height: number;
  tiles: Tile[];
  actors: Actor[];
  bombs: Bomb[] = [];
  flames: Flame[] = [];
  pickups: Pickup[] = [];
  bursts: Burst[] = [];
  time = 0;
  intro = 3;
  phase: GamePhase = "intro";
  previousPhase: GamePhase = "playing";
  revision = 0;
  id = 1;
  wave = 1;
  waveDelay = 0;
  shrink = 0;
  winner = "";
  message = "";
  messageTime = 0;
  bossTimer = 4;
  bossAction = "HUNTING";
  bossCharge = 0;
  bossDash = 0;
  bossAttacks = 0;
  bossDirection = 0;
  warnings: { x: number; z: number; time: number; kind: "stomp" | "strike" }[] =
    [];
  eventTimer = 14;
  totalTime = 0;
  combo = 0;
  comboTime = 0;
  impact = 0;
  rankedToken?: string;
  replay: [number, number][] = [];
  pendingActions = 0;
  chainCount = 0;
  chainHadPlayer = false;
  stats: MatchStats = {
    bombs: 0,
    blocks: 0,
    pickups: 0,
    kills: 0,
    chains: 0,
    abilities: 0,
    steps: 0,
    hits: 0,
  };
  rng: () => number;
  onFinish?: () => void;
  constructor(config: MatchConfig, character = "boomer") {
    this.config = {
      ...config,
      bots: Math.max(1, Math.min(3, config.bots)),
      duration: Math.max(30, config.duration),
    };
    const arena = generate(this.config);
    this.width = arena.width;
    this.height = arena.height;
    this.tiles = arena.tiles;
    this.rng = random(config.seed + "combat");
    this.actors = arena.spawns
      .slice(0, this.config.bots + 1)
      .map(([x, z], i) =>
        this.createActor(
          i,
          x,
          z,
          i === 0 ? character : characters[(i + 1) % 6].id,
        ),
      );
    if (config.seed === "FIRST-BLAST") {
      this.tile(3, 2)!.kind = "crate";
      this.tile(3, 2)!.drop = 0;
      this.player.hp = 3;
    }
    if (config.mode === "boss") {
      this.actors = this.actors.slice(0, 1);
      const x = Math.floor(this.width / 2),
        z = Math.floor(this.height / 2);
      this.tile(x, z)!.kind = "floor";
      const boss = this.createActor(1, x, z, "tanko");
      boss.name = "KING KABOOM";
      boss.hp = 10;
      boss.capacity = 8;
      boss.range = 3;
      boss.speed = 0.85;
      // Open a connected hunting ground; the boss can follow across terraces.
      for (const t of this.tiles)
        if (
          t.kind === "crate" ||
          (t.kind === "wall" &&
            t.x > 0 &&
            t.z > 0 &&
            t.x < this.width - 1 &&
            t.z < this.height - 1)
        )
          t.kind = "floor";
      this.actors.push(boss);
    }
  }
  createActor(id: number, x: number, z: number, character: string): Actor {
    const c = characters.find((v) => v.id === character)!;
    return {
      id,
      name: id === 0 ? "YOU" : c.name,
      character,
      x,
      z,
      fromX: x,
      fromZ: z,
      move: 0,
      moveTime: 0.2,
      facing: 2,
      alive: true,
      hp:
        (this.config.mode === "survival" || this.config.mode === "boss") &&
        id === 0
          ? 3
          : 1,
      shield: (this.config.floors ?? 1) > 1 ? 1 : 0,
      capacity: this.config.capacity,
      range: this.config.range,
      speed: c.speed,
      kind: "standard",
      hitFlash: 0,
      shieldFlash: 0,
      arsenal: this.config.specialBombs
        ? ["standard", "ice", "cluster", "remote"]
        : ["standard"],
      cooldown: 0,
      effect: 0,
      invulnerable: 1,
      stun: 0,
      curse: 0,
      kick: false,
      throw: false,
      score: 0,
      respawn: 0,
      think: 0.6 + id * 0.15,
      personality:
        id === 0
          ? "human"
          : (["aggressive", "collector", "trickster", "defensive"] as const)[
              (id + Math.floor(this.rng() * 4)) % 4
            ],
    };
  }
  get player() {
    return this.actors[0];
  }
  tile(x: number, z: number) {
    if (x < 0 || z < 0 || x >= this.width || z >= this.height) return undefined;
    return this.tiles[z * this.width + x];
  }
  elevation(x: number, z: number) {
    return (this.tile(x, z)?.level ?? 0) * 1.5;
  }
  connected(x: number, z: number, nx: number, nz: number) {
    const a = this.tile(x, z),
      b = this.tile(nx, nz);
    return (
      !!a &&
      !!b &&
      (a.level === b.level ||
        (Math.abs(a.level - b.level) === 1 && a.stair && b.stair))
    );
  }
  control(dir: number, actions = 0) {
    if (this.phase !== "playing") return;
    actions |= this.pendingActions;
    this.pendingActions = 0;
    if (this.rankedToken) this.replay.push([dir, actions]);
    const p = this.player;
    if (p.move > 0) this.pendingActions |= actions;
    if (p.move <= 0) {
      if (actions & 1) this.place(p);
      if (actions & 2) this.ability(p);
      if (actions & 4) this.secondary(p);
      if (actions & 8) this.cycleBomb(p);
      if (actions & 16) this.remote(p);
      const choice = (actions >> 5) - 1;
      if (choice >= 0 && choice < p.arsenal.length) p.kind = p.arsenal[choice];
    }
    if (dir >= 0 && dir < 4) this.move(p, dir);
  }
  cycleBomb(a: Actor) {
    if (this.phase !== "playing" || !a.alive) return;
    a.kind = a.arsenal[(a.arsenal.indexOf(a.kind) + 1) % a.arsenal.length];
    if (a.id === 0) {
      this.announce(`${a.kind.toUpperCase()} EQUIPPED`);
      sound("pickup");
    }
  }
  remote(a: Actor) {
    if (this.phase !== "playing" || !a.alive) return;
    this.bombs
      .filter((b) => b.owner === a.id && b.kind === "remote")
      .forEach((b) => this.detonate(b));
  }
  announce(text: string) {
    this.message = text;
    this.messageTime = 2.4;
  }
  walkable(a: Actor, x: number, z: number, ignoreBomb = false) {
    const t = this.tile(x, z);
    if (
      !t ||
      x < 0 ||
      z < 0 ||
      x >= this.width ||
      z >= this.height ||
      t.kind === "wall" ||
      (t.kind === "crate" && !(a.character === "ghosty" && a.effect > 0))
    )
      return false;
    if (this.unsafe(x, z)) return false;
    const bomb = this.bombs.find(
      (b) => !b.flight && b.heldBy === undefined && b.x === x && b.z === z,
    );
    return (
      !bomb ||
      ignoreBomb ||
      (bomb.owner === a.id && bomb.pass) ||
      (a.character === "ghosty" && a.effect > 0)
    );
  }
  unsafe(x: number, z: number) {
    return (
      this.shrink > 0 &&
      (x <= this.shrink ||
        z <= this.shrink ||
        x >= this.width - 1 - this.shrink ||
        z >= this.height - 1 - this.shrink)
    );
  }
  move(a: Actor, dir: number) {
    if (this.phase !== "playing" || !a.alive || a.move > 0 || a.stun > 0)
      return false;
    if (a.curse > 0) dir = (dir + 2) % 4;
    a.facing = dir;
    const [dx, dz] = directions[dir];
    const x = a.x + dx,
      z = a.z + dz;
    const b = this.bombs.find(
      (v) => !v.flight && v.heldBy === undefined && v.x === x && v.z === z,
    );
    if (b && a.kick) {
      const nx = x + dx,
        nz = z + dz;
      if (
        this.tile(nx, nz)?.kind === "floor" &&
        this.connected(x, z, nx, nz) &&
        !this.bombs.some((v) => v.x === nx && v.z === nz)
      ) {
        b.x = nx;
        b.z = nz;
        b.pass = false;
        b.velocity = [dx, dz];
        b.slide = 0.12;
      }
    }
    if (!this.connected(a.x, a.z, x, z) || !this.walkable(a, x, z))
      return false;
    a.fromX = a.x;
    a.fromZ = a.z;
    a.x = x;
    a.z = z;
    const speed =
      a.speed *
      (a.character === "spark" && a.effect > 0 ? 1.6 : 1) *
      (a.curse > 0 ? 0.65 : 1) *
      (this.tile(x, z)?.water && !this.tile(x, z)?.bridge ? 0.72 : 1) *
      (a.holding !== undefined ? 0.85 : 1);
    a.moveTime = 0.24 / speed;
    a.move = a.moveTime;
    if (a.id === 0)
      sound(
        this.tile(x, z)?.water && !this.tile(x, z)?.bridge ? "splash" : "step",
      );
    if (a.id === 0) this.stats.steps++;
    return true;
  }
  place(a: Actor, override?: BombKind) {
    if (
      this.phase !== "playing" ||
      !a.alive ||
      a.stun > 0 ||
      a.move > 0 ||
      a.holding !== undefined ||
      this.tile(a.x, a.z)?.kind !== "floor" ||
      this.bombs.some((b) => b.x === a.x && b.z === a.z) ||
      this.bombs.filter((b) => b.owner === a.id).length >= a.capacity
    )
      return false;
    const kind = override ?? a.kind;
    const fuse =
      kind === "remote"
        ? 12
        : kind === "mine"
          ? 15
          : kind === "mega"
            ? 3
            : this.config.mode === "mayhem"
              ? 1.7
              : 2.5;
    const target =
      kind === "sticky"
        ? this.actors.find(
            (v) =>
              v.id !== a.id &&
              v.alive &&
              Math.abs(v.x - a.x) + Math.abs(v.z - a.z) <= 1,
          )?.id
        : undefined;
    this.bombs.push({
      id: this.id++,
      owner: a.id,
      x: a.x,
      z: a.z,
      kind,
      range: Math.min(
        8,
        a.range +
          (kind === "mega" ? 2 : 0) +
          (a.character === "fuse" && a.effect > 0 ? 2 : 0),
      ),
      fuse,
      age: 0,
      pass: true,
      tick: 0,
      target,
    });
    if (a.id === 0) this.stats.bombs++;
    sound("place");
    return true;
  }
  secondary(a: Actor) {
    if (this.phase !== "playing" || !a.alive || a.stun > 0 || a.move > 0)
      return;
    if (a.holding !== undefined) {
      const b = this.bombs.find((v) => v.id === a.holding);
      if (!b) {
        a.holding = undefined;
        return;
      }
      const [dx, dz] = directions[a.facing];
      for (let d = a.throw ? 4 : 2; d > 0; d--) {
        const x = a.x + dx * d,
          z = a.z + dz * d;
        if (
          this.tile(x, z)?.kind !== "floor" ||
          this.unsafe(x, z) ||
          this.bombs.some((v) => v.id !== b.id && v.x === x && v.z === z)
        )
          continue;
        b.flight = { x: a.x, z: a.z, time: 0.45, duration: 0.45 };
        b.x = x;
        b.z = z;
        b.heldBy = undefined;
        b.target = undefined;
        b.pass = false;
        a.holding = undefined;
        sound("ability");
        if (a.id === 0) this.announce("AIRMAIL! · BOMB AWAY");
        return;
      }
      if (a.id === 0) this.announce("NO LANDING SPACE · TURN AND THROW");
      return;
    }
    const [dx, dz] = directions[a.facing];
    const b = this.bombs.find(
      (v) =>
        v.heldBy === undefined &&
        !v.flight &&
        ((v.x === a.x && v.z === a.z) ||
          (v.x === a.x + dx &&
            v.z === a.z + dz &&
            this.connected(a.x, a.z, v.x, v.z))),
    );
    if (b) {
      b.heldBy = a.id;
      b.velocity = undefined;
      b.target = undefined;
      b.x = a.x;
      b.z = a.z;
      a.holding = b.id;
      sound("pickup");
      if (a.id === 0)
        this.announce("BOMB IN HAND · Q TO THROW · FUSE STILL TICKING");
    } else if (a.id === 0)
      this.announce("FACE A BOMB · Q TO PICK UP / F TO DETONATE REMOTES");
  }
  ability(a: Actor) {
    if (
      this.phase !== "playing" ||
      !this.config.abilities ||
      !a.alive ||
      a.cooldown > 0 ||
      a.stun > 0 ||
      a.move > 0
    )
      return false;
    const c = characters.find((v) => v.id === a.character)!;
    const [dx, dz] = directions[a.facing];
    if (c.ability.id === "dash" || c.ability.id === "teleport") {
      let distance = c.ability.id === "dash" ? 2 : 3;
      let nx = a.x,
        nz = a.z;
      for (let d = 1; d <= distance; d++) {
        const x = a.x + dx * d,
          z = a.z + dz * d;
        if (
          c.ability.id === "dash" &&
          (!this.connected(nx, nz, x, z) || !this.walkable(a, x, z))
        )
          break;
        if (this.walkable(a, x, z)) {
          nx = x;
          nz = z;
        }
      }
      if (nx === a.x && nz === a.z) return false;
      a.x = nx;
      a.z = nz;
      a.fromX = nx;
      a.fromZ = nz;
      a.invulnerable = 0.2;
    } else if (c.ability.id === "shield") a.shield = 1;
    else a.effect = c.ability.duration;
    a.cooldown = c.ability.cooldown;
    if (a.id === 0) this.stats.abilities++;
    this.bursts.push({
      id: this.id++,
      x: a.x,
      z: a.z,
      time: 0.5,
      color: c.accent,
    });
    sound("ability");
    return true;
  }
  blastTiles(b: Pick<Bomb, "x" | "z" | "range" | "kind">) {
    const out = [key(b.x, b.z)];
    for (const [dx, dz] of directions)
      for (let d = 1; d <= b.range; d++) {
        const x = b.x + dx * d,
          z = b.z + dz * d,
          t = this.tile(x, z);
        if (
          !t ||
          x < 0 ||
          x >= this.width ||
          z < 0 ||
          z >= this.height ||
          t.kind === "wall" ||
          t.level !== this.tile(b.x, b.z)?.level
        )
          break;
        out.push(key(x, z));
        if (t.kind === "crate" && b.kind !== "piercing") break;
      }
    return out;
  }
  dangerMap() {
    const danger = new Map<string, number>();
    for (const w of this.warnings) danger.set(key(w.x, w.z), w.time);
    const times = new Map(this.bombs.map((b) => [b.id, b.fuse]));
    for (let pass = 0; pass < this.bombs.length; pass++)
      for (const b of this.bombs) {
        const blast = this.blastTiles(b);
        for (const other of this.bombs)
          if (blast.includes(key(other.x, other.z)))
            times.set(
              other.id,
              Math.min(times.get(other.id)!, times.get(b.id)!),
            );
      }
    for (const b of this.bombs) {
      if (b.kind === "smoke" || b.kind === "wind") continue;
      for (const k of this.blastTiles(b))
        danger.set(k, Math.min(danger.get(k) ?? Infinity, times.get(b.id)!));
    }
    for (const f of this.flames)
      if (f.kind !== "smoke" && f.kind !== "wind") danger.set(key(f.x, f.z), 0);
    for (const t of this.tiles)
      if (this.unsafe(t.x, t.z) || this.hazardActive(t))
        danger.set(key(t.x, t.z), 0);
      else if (t.hazard && this.config.biome === "lava" && this.time % 8 >= 4)
        danger.set(key(t.x, t.z), 6 - (this.time % 8));
    return danger;
  }
  neighbors(a: Actor, k: string) {
    const [x, z] = k.split(",").map(Number);
    return directions
      .map(([dx, dz]) => key(x + dx, z + dz))
      .filter((v) => {
        const [nx, nz] = v.split(",").map(Number);
        return this.connected(x, z, nx, nz) && this.walkable(a, nx, nz);
      });
  }
  escape(a: Actor, danger: Map<string, number>) {
    const start = key(a.x, a.z);
    return astar(
      start,
      (k) => !danger.has(k),
      (k) => this.neighbors(a, k),
      (k) => (danger.has(k) ? 1.1 : 1),
    );
  }
  bot(a: Actor) {
    if (!a.alive || a.move > 0 || a.stun > 0) return;
    const danger = this.dangerMap(),
      start = key(a.x, a.z);
    let path: string[] = [];
    if (danger.has(start)) {
      path = this.escape(a, danger);
      if (!path.length && a.cooldown <= 0) {
        this.ability(a);
        return;
      }
    } else {
      const rivals = this.actors.filter((v) => v.alive && v.id !== a.id);
      const pickups = new Set(this.pickups.map((p) => key(p.x, p.z)));
      const personality = a.personality;
      const pickupPriority =
        personality === "collector" ||
        personality === "defensive" ||
        a.range < 3;
      if (pickups.size && pickupPriority)
        path = astar(
          start,
          (k) => pickups.has(k),
          (k) => this.neighbors(a, k).filter((n) => !danger.has(n)),
        );
      const nearCrate = directions.some(
        ([dx, dz]) => this.tile(a.x + dx, a.z + dz)?.kind === "crate",
      );
      const candidateBlast = this.blastTiles({
        x: a.x,
        z: a.z,
        range: a.range,
        kind: a.kind,
      });
      const nearEnemy = rivals.some((v) =>
        candidateBlast.includes(key(v.x, v.z)),
      );
      const chainOpportunity =
        personality === "trickster" &&
        this.bombs.some((b) => candidateBlast.includes(key(b.x, b.z)));
      if (
        (nearCrate || nearEnemy || chainOpportunity) &&
        this.bombs.filter((b) => b.owner === a.id).length < a.capacity
      ) {
        const simulated: Bomb = {
          id: -1,
          owner: a.id,
          x: a.x,
          z: a.z,
          kind: a.kind,
          range: a.range,
          fuse: 2.5,
          age: 0,
          pass: true,
          tick: 0,
        };
        const simDanger = new Map(danger);
        this.blastTiles(simulated).forEach((k) => simDanger.set(k, 2.5));
        const safe = this.escape(a, simDanger);
        if (
          safe.length &&
          safe.length * a.moveTime <
            (this.config.mode === "mayhem" ? 1.25 : 2) &&
          this.rng() <
            (personality === "defensive"
              ? 0.6
              : personality === "aggressive"
                ? 1.1
                : 1) *
              { easy: 0.32, normal: 0.65, hard: 0.88, insane: 1 }[
                this.config.difficulty
              ]
        ) {
          this.place(a);
          if (a.kind === "remote") a.effect = 2;
          if (
            a.cooldown <= 0 &&
            (a.character === "fuse" || a.character === "spark")
          )
            this.ability(a);
          path = safe;
        }
      }
      if (!path.length) {
        const target = rivals.sort(
          (p, q) =>
            Math.abs(p.x - a.x) +
            Math.abs(p.z - a.z) -
            (Math.abs(q.x - a.x) + Math.abs(q.z - a.z)),
        )[0];
        if (target && personality !== "defensive") {
          const goal = key(target.x, target.z);
          path = astar(
            start,
            (k) => k === goal,
            (k) => this.neighbors(a, k).filter((n) => !danger.has(n)),
            () => 1,
            (k) => {
              const [x, z] = k.split(",").map(Number);
              return Math.abs(x - target.x) + Math.abs(z - target.z);
            },
          );
        }
        if (!path.length) {
          const choices = this.tiles.filter(
            (t) =>
              t.kind === "floor" &&
              !danger.has(key(t.x, t.z)) &&
              directions.some(
                ([dx, dz]) => this.tile(t.x + dx, t.z + dz)?.kind === "crate",
              ),
          );
          choices.sort(
            (p, q) =>
              Math.abs(p.x - a.x) +
              Math.abs(p.z - a.z) -
              (Math.abs(q.x - a.x) + Math.abs(q.z - a.z)),
          );
          const goal = choices[0];
          if (goal)
            path = astar(
              start,
              (k) => k === key(goal.x, goal.z),
              (k) => this.neighbors(a, k).filter((n) => !danger.has(n)),
            );
        }
      }
    }
    if (path.length) {
      const [x, z] = path[0].split(",").map(Number);
      const dir = directions.findIndex(
        ([dx, dz]) => a.x + dx === x && a.z + dz === z,
      );
      if (dir >= 0) this.move(a, dir);
    }
    if (a.cooldown <= 0 && a.character === "tanko" && danger.has(start))
      this.ability(a);
  }
  detonate(b: Bomb, depth = 0) {
    if (depth > 80 || !this.bombs.some((v) => v.id === b.id)) return;
    if (depth === 0) this.chainHadPlayer = false;
    if (b.owner === 0) this.chainHadPlayer = true;
    this.bombs = this.bombs.filter((v) => v.id !== b.id);
    const holder = this.actors.find((a) => a.holding === b.id);
    if (holder) {
      holder.holding = undefined;
      b.x = holder.x;
      b.z = holder.z;
    }
    this.impact = Math.min(1.4, this.impact + 0.6);
    this.chainCount++;
    const tiles = this.blastTiles(b);
    sound(
      ["ice", "shock", "wind", "smoke"].includes(b.kind) ? b.kind : "blast",
    );
    this.bursts.push({
      id: this.id++,
      x: b.x,
      z: b.z,
      time: 0.7,
      color:
        b.kind === "ice"
          ? "#aeedff"
          : b.kind === "shock"
            ? "#b9a3ff"
            : "#ffba64",
    });
    for (const k of tiles) {
      const [x, z] = k.split(",").map(Number),
        t = this.tile(x, z)!;
      const flame: Flame = {
        id: this.id++,
        x,
        z,
        time:
          b.kind === "fire" && t.water && !t.bridge
            ? 0.25
            : b.kind === "fire"
              ? 3
              : b.kind === "smoke"
                ? 2
                : 0.65,
        owner: b.owner,
        kind: b.kind,
        hit: new Set(),
        originX: b.x,
        originZ: b.z,
      };
      this.flames.push(flame);
      if (t.kind === "crate" && b.kind !== "smoke" && b.kind !== "wind") {
        t.kind = "floor";
        this.revision++;
        if (b.owner === 0) this.stats.blocks++;
        if (t.drop < this.config.drops || this.config.seed === "FIRST-BLAST") {
          const core: PickupKind[] = [
            "capacity",
            "range",
            "speed",
            "shield",
            "kick",
            "throw",
            "life",
            "mystery",
            "curse",
          ];
          const special: BombKind[] = [
            "remote",
            "piercing",
            "sticky",
            "mega",
            "ice",
            "fire",
            "shock",
            "cluster",
            "mine",
            "smoke",
            "wind",
          ];
          // Core upgrades are intentionally more common than special bombs.
          const pool = this.config.specialBombs
            ? [...core, ...core, ...special]
            : core;
          this.pickups.push({
            id: this.id++,
            x,
            z,
            kind:
              this.config.seed === "FIRST-BLAST"
                ? "range"
                : pool[Math.floor(this.rng() * pool.length)],
          });
        }
      }
      const other = this.bombs.find((v) => !v.flight && v.x === x && v.z === z);
      if (other) this.detonate(other, depth + 1);
    }
    if (b.kind === "cluster") {
      for (const [dx, dz] of directions) {
        const x = b.x + dx,
          z = b.z + dz;
        if (
          this.tile(x, z)?.kind === "floor" &&
          this.tile(x, z)?.level === this.tile(b.x, b.z)?.level &&
          !this.bombs.some((v) => v.x === x && v.z === z)
        )
          this.bombs.push({
            id: this.id++,
            owner: b.owner,
            x,
            z,
            kind: "standard",
            range: 1,
            fuse: 0.6,
            age: 0,
            pass: false,
            tick: 0,
          });
      }
    }
    if (depth === 0 && this.chainCount > 1) {
      if (this.chainHadPlayer) this.stats.chains++;
      this.announce(`${this.chainCount} BOMB CHAIN!`);
    }
    if (depth === 0) this.chainCount = 0;
  }
  damage(a: Actor, owner: number) {
    if (!a.alive || a.invulnerable > 0) return;
    if (a.shield > 0) {
      a.shield--;
      a.invulnerable = 1.2;
      a.shieldFlash = 0.5;
      sound("shield");
      this.announce(a.id === 0 ? "SHIELD SAVED YOU" : "SHIELD BROKEN");
      return;
    }
    a.hp--;
    a.hitFlash = 0.65;
    sound("hit");
    this.impact = Math.max(this.impact, 0.45);
    a.invulnerable = 1.2;
    if (a.id === 0) this.stats.hits++;
    if (a.hp > 0) return;
    a.alive = false;
    a.move = 0;
    const killer = this.actors.find((v) => v.id === owner);
    if (killer && killer.id !== a.id) {
      killer.score++;
      if (owner === 0) {
        this.stats.kills++;
        this.combo = this.comboTime > 0 ? this.combo + 1 : 1;
        this.comboTime = 5;
      }
    }
    this.bursts.push({
      id: this.id++,
      x: a.x,
      z: a.z,
      time: 1,
      color: characters.find((c) => c.id === a.character)!.color,
    });
    this.announce(`${a.name} ELIMINATED`);
    sound("lose");
    const carried = this.bombs.find((b) => b.heldBy === a.id);
    if (carried) {
      carried.heldBy = undefined;
      carried.pass = false;
    }
    a.holding = undefined;
    if (this.config.mode === "ffa") a.respawn = 2;
  }
  pickup(a: Actor, p: Pickup) {
    this.pickups = this.pickups.filter((v) => v.id !== p.id);
    const k =
      p.kind === "mystery"
        ? (["capacity", "range", "speed", "shield"] as PickupKind[])[
            Math.floor(this.rng() * 4)
          ]
        : p.kind;
    switch (k) {
      case "capacity":
        a.capacity = Math.min(6, a.capacity + 1);
        break;
      case "range":
        a.range = Math.min(6, a.range + 1);
        break;
      case "speed":
        a.speed = Math.min(1.7, a.speed + 0.15);
        break;
      case "shield":
        a.shield = 1;
        break;
      case "kick":
        a.kick = true;
        break;
      case "throw":
        a.throw = true;
        break;
      case "life":
        if (this.config.mode === "survival" || this.config.mode === "boss")
          a.hp = Math.min(5, a.hp + 1);
        else a.shield = 1;
        break;
      case "curse":
        a.curse = 5;
        break;
      default:
        a.kind = k as BombKind;
        if (!a.arsenal.includes(a.kind)) a.arsenal.push(a.kind);
    }
    if (a.id === 0) {
      this.stats.pickups++;
      this.announce(
        k === "curse"
          ? "CURSE: REVERSED CONTROLS"
          : `${k.toUpperCase()} COLLECTED`,
      );
      sound("pickup");
    }
  }
  hazardActive(t: Tile) {
    return t.hazard && this.config.biome === "lava" && this.time % 8 >= 6;
  }
  bossStep(dt: number) {
    const boss = this.actors[1];
    if (!boss?.alive || !this.player.alive) return;
    const phase = boss.hp > 6 ? 1 : boss.hp > 3 ? 2 : 3;
    this.bossTimer -= dt;
    if (this.bossCharge > 0) {
      this.bossCharge -= dt;
      if (this.bossCharge <= 0) {
        this.bossDash = 0.75;
        this.bossAction = "CHARGING";
        sound("ability");
      }
    } else if (this.bossDash > 0) {
      this.bossDash -= dt;
      if (boss.move === 0) {
        if (this.move(boss, this.bossDirection)) {
          boss.moveTime = 0.09;
          boss.move = 0.09;
        } else this.bossDash = 0;
      }
      if (
        Math.abs(boss.x - this.player.x) + Math.abs(boss.z - this.player.z) <=
          1 &&
        this.tile(boss.x, boss.z)?.level ===
          this.tile(this.player.x, this.player.z)?.level
      )
        this.damage(this.player, 1);
    } else if (boss.move === 0 && boss.stun === 0) {
      this.bossAction = "HUNTING";
      const path = astar(
        key(boss.x, boss.z),
        (k) => {
          const [x, z] = k.split(",").map(Number);
          return (
            this.tile(x, z)?.level ===
              this.tile(this.player.x, this.player.z)?.level &&
            Math.abs(x - this.player.x) + Math.abs(z - this.player.z) <= 2
          );
        },
        (k) => this.neighbors(boss, k),
        () => 1,
        (k) => {
          const [x, z] = k.split(",").map(Number);
          return Math.abs(x - this.player.x) + Math.abs(z - this.player.z);
        },
      );
      if (path.length) {
        const [x, z] = path[0].split(",").map(Number);
        const dir = directions.findIndex(
          ([dx, dz]) => boss.x + dx === x && boss.z + dz === z,
        );
        if (dir >= 0) this.move(boss, dir);
      }
    }
    if (this.bossTimer <= 0) {
      this.bossTimer = 4.1 - phase * 0.55;
      this.bossAttacks++;
      if (this.bossAttacks % 3 === 1) {
        this.bossAction = "CHARGE WINDUP";
        this.bossCharge = 0.9;
        const dx = this.player.x - boss.x,
          dz = this.player.z - boss.z;
        this.bossDirection =
          Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : dz > 0 ? 2 : 0;
        const [sx, sz] = directions[this.bossDirection];
        for (let d = 1; d <= 5; d++) {
          const x = boss.x + sx * d,
            z = boss.z + sz * d;
          if (!this.tile(x, z) || this.tile(x, z)?.kind !== "floor") break;
          this.warnings.push({ x, z, time: 0.9, kind: "strike" });
        }
        this.announce("KING KABOOM · DODGE THE CHARGE!");
      } else {
        this.bossAction = "STOMP WINDUP";
        const center = this.bossAttacks % 3 === 0 ? this.player : boss;
        for (const t of this.tiles)
          if (
            t.kind === "floor" &&
            t.level === this.tile(center.x, center.z)?.level &&
            Math.abs(t.x - center.x) + Math.abs(t.z - center.z) <= phase + 1
          )
            this.warnings.push({ x: t.x, z: t.z, time: 1.1, kind: "stomp" });
        this.announce(`KING KABOOM · PHASE ${phase} · SHOCKWAVE INCOMING`);
      }
      if (
        phase >= 2 &&
        this.actors.filter((a) => a.id > 1 && a.alive).length < 2
      ) {
        const t = this.tiles.find(
          (t) =>
            t.kind === "floor" &&
            Math.abs(t.x - boss.x) + Math.abs(t.z - boss.z) === 2 &&
            !this.bombs.some((b) => b.x === t.x && b.z === t.z),
        );
        if (t) {
          const minion = this.createActor(this.actors.length, t.x, t.z, "fuse");
          minion.name = "FUSELING";
          minion.invulnerable = 0.7;
          minion.range = 1;
          this.actors.push(minion);
        }
      }
    }
  }
  finish(winner: string) {
    if (this.phase === "finished") return;
    this.phase = "finished";
    this.winner = winner;
    sound(winner === "YOU" ? "win" : "lose");
    this.onFinish?.();
  }
  pause() {
    if (this.phase === "finished") return;
    if (this.phase === "paused") this.phase = this.previousPhase;
    else {
      this.previousPhase = this.phase;
      this.phase = "paused";
    }
  }
  step(dt: number) {
    if (this.phase === "paused" || this.phase === "finished") return;
    if (this.phase === "intro") {
      this.intro -= dt;
      if (this.intro <= 0) {
        this.phase = "playing";
        this.announce("MAKE SOME NOISE.");
      }
      return;
    }
    this.time += dt;
    this.totalTime += dt;
    this.impact = Math.max(0, this.impact - dt * 2.5);
    this.comboTime = Math.max(0, this.comboTime - dt);
    this.messageTime = Math.max(0, this.messageTime - dt);
    this.bursts.forEach((v) => (v.time -= dt));
    this.bursts = this.bursts.filter((v) => v.time > 0);
    this.flames.forEach((v) => (v.time -= dt));
    this.flames = this.flames.filter((v) => v.time > 0);
    for (const w of this.warnings) {
      w.time -= dt;
      if (w.time <= 0) {
        this.flames.push({
          id: this.id++,
          x: w.x,
          z: w.z,
          time: 0.55,
          owner: 1,
          kind: "standard",
          hit: new Set(),
        });
        this.impact = 0.8;
      }
    }
    this.warnings = this.warnings.filter((w) => w.time > 0);
    this.eventTimer -= dt;
    if (
      this.eventTimer <= 0 &&
      this.config.seed !== "FIRST-BLAST" &&
      this.config.mode !== "boss"
    ) {
      this.eventTimer = 18;
      const danger = this.dangerMap();
      const choices = this.tiles.filter(
        (t) =>
          t.kind === "floor" &&
          !this.unsafe(t.x, t.z) &&
          !danger.has(key(t.x, t.z)) &&
          !this.pickups.some((p) => p.x === t.x && p.z === t.z),
      );
      const t = choices[Math.floor(this.rng() * choices.length)];
      if (t) {
        const pool: PickupKind[] = this.config.specialBombs
          ? [
              "shield",
              "speed",
              "mega",
              "fire",
              "shock",
              "piercing",
              "mine",
              "wind",
              "sticky",
            ]
          : ["shield", "speed", "range"];
        this.pickups.push({
          id: this.id++,
          x: t.x,
          z: t.z,
          kind: pool[Math.floor(this.rng() * pool.length)],
        });
        this.bursts.push({
          id: this.id++,
          x: t.x,
          z: t.z,
          time: 1,
          color: "#44ffd2",
        });
        this.announce(`SUPPLY DROP · FLOOR ${t.level + 1}`);
      }
    }
    for (const a of this.actors) {
      a.invulnerable = Math.max(0, a.invulnerable - dt);
      a.hitFlash = Math.max(0, a.hitFlash - dt);
      a.shieldFlash = Math.max(0, a.shieldFlash - dt);
      a.stun = Math.max(0, a.stun - dt);
      a.cooldown = Math.max(0, a.cooldown - dt);
      a.effect = Math.max(0, a.effect - dt);
      a.curse = Math.max(0, a.curse - dt);
      a.move = Math.max(0, a.move - dt);
      if (!a.alive && a.respawn > 0) {
        a.respawn -= dt;
        if (a.respawn <= 0) {
          const safe = this.tiles.filter(
            (t) =>
              t.kind === "floor" &&
              !this.unsafe(t.x, t.z) &&
              !this.dangerMap().has(key(t.x, t.z)),
          );
          const t = safe[Math.floor(this.rng() * safe.length)];
          if (t) {
            a.x = t.x;
            a.z = t.z;
            a.fromX = t.x;
            a.fromZ = t.z;
            a.alive = true;
            a.hp = 1;
            a.invulnerable = 2;
          } else a.respawn = 0.5;
        }
      }
      if (!a.alive) continue;
      for (const b of this.bombs)
        if (b.owner === a.id && (b.x !== a.x || b.z !== a.z) && a.move === 0)
          b.pass = false;
      for (const f of this.flames) {
        const t = a.move > 0 ? 1 - a.move / a.moveTime : 1;
        const x = Math.round(a.fromX + (a.x - a.fromX) * t),
          z = Math.round(a.fromZ + (a.z - a.fromZ) * t);
        if (
          f.x !== x ||
          f.z !== z ||
          f.hit.has(a.id) ||
          (this.config.mode === "boss" && a.id === 1 && f.owner === 1)
        )
          continue;
        f.hit.add(a.id);
        if (f.kind === "smoke") continue;
        if (f.kind === "wind") {
          const dx = a.x - (f.originX ?? a.x - 1),
            dz = a.z - (f.originZ ?? a.z);
          const dir =
            Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : dz > 0 ? 2 : 0;
          this.move(a, dir);
        } else if (f.kind === "ice") {
          a.stun = 2;
          a.invulnerable = 0.3;
        } else if (f.kind === "shock") {
          a.stun = 1;
          a.cooldown = Math.max(a.cooldown, 4);
        } else this.damage(a, f.owner);
      }
      if (a.move === 0) {
        const pickup = this.pickups.find(
          (p) =>
            p.x === a.x &&
            p.z === a.z &&
            !this.flames.some((f) => f.x === p.x && f.z === p.z && f.time > 0),
        );
        if (pickup) this.pickup(a, pickup);
        const tile = this.tile(a.x, a.z);
        if (this.unsafe(a.x, a.z) || (tile && this.hazardActive(tile)))
          this.damage(a, -1);
        if (
          tile?.hazard &&
          this.config.biome === "space" &&
          a.invulnerable <= 0
        ) {
          const pads = this.tiles.filter((v) => v.hazard && v.kind === "floor");
          const idx = pads.indexOf(tile),
            dest = pads[(idx + 1) % pads.length];
          if (dest && this.walkable(a, dest.x, dest.z)) {
            a.x = dest.x;
            a.z = dest.z;
            a.fromX = a.x;
            a.fromZ = a.z;
            a.invulnerable = 0.6;
          }
        }
        if (tile?.hazard && this.config.biome === "ice") this.move(a, a.facing);
      }
      if (a.id > 0 && (this.config.mode !== "boss" || a.id > 1)) {
        if (
          a.kind === "remote" &&
          a.effect <= 0 &&
          this.bombs.some((b) => b.owner === a.id && b.kind === "remote")
        )
          this.remote(a);
        if (
          this.config.seed === "FIRST-BLAST" &&
          (this.stats.pickups === 0 || this.stats.abilities === 0)
        )
          continue;
        a.think -= dt;
        if (a.think <= 0) {
          this.bot(a);
          a.think = { easy: 0.38, normal: 0.17, hard: 0.09, insane: 0.04 }[
            this.config.difficulty
          ];
        }
      }
    }
    for (const b of [...this.bombs]) {
      if (b.heldBy !== undefined) {
        const a = this.actors.find((v) => v.id === b.heldBy);
        if (a?.alive) {
          b.x = a.x;
          b.z = a.z;
        } else b.heldBy = undefined;
      }
      if (b.flight) {
        b.flight.time -= dt;
        if (b.flight.time <= 0) b.flight = undefined;
      }
      if (b.velocity) {
        b.slide = (b.slide ?? 0.12) - dt;
        if (b.slide <= 0) {
          const [dx, dz] = b.velocity,
            nx = b.x + dx,
            nz = b.z + dz;
          if (
            this.tile(nx, nz)?.kind === "floor" &&
            this.connected(b.x, b.z, nx, nz) &&
            !this.bombs.some(
              (v) => v.id !== b.id && v.x === nx && v.z === nz,
            ) &&
            !this.actors.some((a) => a.alive && a.x === nx && a.z === nz)
          ) {
            b.x = nx;
            b.z = nz;
            b.slide = 0.12;
          } else b.velocity = undefined;
        }
      }
      b.fuse -= dt;
      b.age += dt;
      if (b.target !== undefined) {
        const a = this.actors.find((v) => v.id === b.target && v.alive);
        if (a) {
          b.x = a.x;
          b.z = a.z;
        }
      }
      if (
        b.kind === "mine" &&
        b.age > 1 &&
        this.actors.some(
          (a) =>
            a.alive &&
            a.id !== b.owner &&
            Math.abs(a.x - b.x) + Math.abs(a.z - b.z) <= 1,
        )
      )
        b.fuse = 0;
      if (b.fuse <= 0) this.detonate(b);
      else if (
        b.owner === 0 &&
        Math.floor(b.age * (b.fuse < 1 ? 9 : 4)) > b.tick
      ) {
        b.tick = Math.floor(b.age * (b.fuse < 1 ? 9 : 4));
        sound("tick");
      }
    }
    if (this.config.mode === "boss") this.bossStep(dt);
    const alive = this.actors.filter((a) => a.alive);
    if (this.config.mode === "ffa") {
      const champion = this.actors.find((a) => a.score >= 5);
      if (champion) this.finish(champion.name);
      else if (this.time >= this.config.duration) {
        const sorted = [...this.actors].sort((a, b) => b.score - a.score);
        this.finish(
          sorted[0].score === sorted[1].score ? "DRAW" : sorted[0].name,
        );
      }
    } else if (this.config.mode === "survival") {
      if (!this.player.alive) this.finish("THE ARENA");
      else if (alive.length === 1) {
        if (this.wave >= 5) this.finish("YOU");
        else {
          this.waveDelay += dt;
          if (this.waveDelay > 1.5) {
            this.wave++;
            this.waveDelay = 0;
            this.bombs = [];
            this.flames = [];
            this.shrink = 0;
            for (let i = 1; i <= this.config.bots; i++) {
              const x = i === 1 ? this.width - 2 : i === 2 ? this.width - 2 : 1,
                z = i === 1 ? this.height - 2 : i === 2 ? 1 : this.height - 2;
              const a = this.createActor(
                i,
                x,
                z,
                characters[(i + this.wave) % 6].id,
              );
              a.hp = this.wave >= 4 ? 2 : 1;
              a.range = Math.min(5, this.wave + 1);
              this.actors[i] = a;
            }
            this.player.invulnerable = 2;
            this.announce(`WAVE ${this.wave} / 5`);
            this.time = 0;
          }
        }
      }
    } else if (this.config.mode === "boss") {
      if (!this.player.alive) this.finish("KING KABOOM");
      else if (!this.actors[1].alive) this.finish("YOU");
    } else if (alive.length <= 1) this.finish(alive[0]?.name ?? "DRAW");
    if (this.config.mode !== "ffa" && this.time > this.config.duration - 30) {
      const shrink =
        1 + Math.floor((this.time - (this.config.duration - 30)) / 7);
      this.shrink = Math.min(
        shrink,
        Math.floor(Math.min(this.width, this.height) / 2),
      );
      if (this.time > this.config.duration + 7) this.finish("DRAW");
    }
  }
}
