# BOMBASTIC — Sky Riot

A vibrant 3D browser arena game: three connected terrace floors, tactical bots, animated water, an active boss and bold Persona-inspired menus. React 19, TypeScript, Three.js, React Three Fiber, Zustand, Vite and procedural Web Audio.

## Play locally

Requires Node.js 22.14+ and npm.

```sh
npm ci
npm run build
npm start
```

Open **http://localhost:4174/**. This serves the game and a shared SQLite leaderboard. Scores persist in ignored `data/rankings.sqlite`; other browsers using this server see the same scores. Appearance, coins and ordinary progression stay in the browser. Audio starts after interaction.

For development, keep `npm start` running and use `npm run dev` in another terminal. Vite forwards `/api` to port 4174. `npm run dev:server` rebuilds/runs the backend. `npm run preview` previews only the static game.

```sh
npm test          # simulation, save/economy, replay and HTTP persistence checks
npm run build    # strict frontend/backend TypeScript, Vite and local server bundle
```

## Included

- One, two or three connected floors, gold stairs and floor-specific blast propagation.
- Rivers, wooden bridges, waterfalls, swaying stylized trees, fireflies and saturated biome materials.
- Classic Battle, Free-for-All, five-wave Survival, Bomb Mayhem and King Kaboom.
- A boss that hunts across stairs, telegraphs charges/shockwaves and summons Fuseling minions in later phases.
- Six characters, cooldown abilities and tactical A* bots with four difficulties and personalities.
- Twelve bomb behaviors. Start with Standard, Ice, Cluster and Remote; collected types join the switchable arsenal.
- Pick up your own or an opponent's bomb, carry a live fuse and throw in an animated arc across obstacles/floors. Base range is two tiles; Throw pickups extend it to four. Kick makes bombs roll until blocked.
- Regular supply drops, kill combos, impact rings, particles, squash/stretch motion, shake and sound cues.
- Red hit blinking on every fighter including the boss, plus cyan shield feedback. Reduced Motion uses a steady hit tint.
- Customization, shop, achievements, challenges, saved progression, tutorial, pause, rematch and configurable controls.
- Shared daily/all-time ranked boards, server-verified replays and one best score per player.

## Controls

**WASD / arrows** move · **Space** plant · **E / Shift** ability · **Q** pick up / throw · **R** cycle bomb · **F** detonate remotes · **Esc** pause · **Tab** standings. Arsenal and ability HUD buttons are clickable. Game actions can be rebound in Settings.

Stairs connect floors. Blasts stop at height boundaries; throws can cross them. Wading slows movement, bridges preserve speed and water shortens lingering fire.

## Vercel hosting

Import the personal GitHub repository as a **Vite** project. `vercel.json` supplies install/build/output settings; `api/` contains the cloud leaderboard functions. The game deploys without a database, but ranked play stays offline until storage is connected.

1. Import the repository from your **nexonomy personal account**, not an organization.
2. Use **Vite**, build `npm run build`, output `dist`, Node.js **22.x**.
3. Connect **Upstash Redis** through Vercel Storage/Marketplace. Set server-only `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for Production and Preview. Enter credentials directly in Vercel; never commit them or prefix them with `VITE_`.
4. Redeploy after storage setup; `/api/health` verifies connection. Production and preview boards have separate namespaces by default.
5. Future pushes to `main` can deploy through Vercel Git integration. GitHub Actions runs tests/build without deployment credentials.

See [DEPLOYMENT.md](DEPLOYMENT.md) and [.env.example](.env.example). Vercel uses Redis; SQLite is local-only. No local database or browser save belongs in the repository.

## Ranked rules

Ranked runs use a daily seed, three floors, Hard bots and two-minute Free-for-All. Submit a completed run from Results. The server replays inputs and computes points: victory +1,000, KO +150, crate +10, pickup +15 and fast-victory bonus. Supplied score numbers are ignored. Sessions expire after one hour and cannot be submitted twice.

This is an anonymous leaderboard: IDs live in browser storage. Replay verification enforces game rules but does not prevent automated play or multiple identities. Names/scores become visible to other players when submitted. There are no fabricated entries.

## Assets and scope

Characters, trees, water shaders, UI, gameplay and audio are original. Selected crates, rocks, barrels and stone meshes/textures come from the supplied KUBIKOS World package and retain their original license; see [NOTICE.txt](public/assets/NOTICE.txt). Keep the repository private unless appropriate redistribution rights are confirmed. The original package is untouched; extraction/source copies stay in ignored `.reference/`.

Desktop keyboard gameplay is supported. Touch/gamepad, local/online multiplayer, team battle, moving gates/conveyors, breakable bridges, seasonal cosmetics and character unlock trees are not implemented. Floors are connected terraces at different elevations rather than overlapping indoor storeys. Low graphics/resolution scaling are available.

Further documentation: [CONTROLS.md](CONTROLS.md), [GAME_DESIGN.md](GAME_DESIGN.md), [ARCHITECTURE.md](ARCHITECTURE.md).
