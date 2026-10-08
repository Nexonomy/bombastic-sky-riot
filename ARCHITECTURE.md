# Architecture

## Separation

- `src/game/definitions.ts`: typed characters, abilities, biomes, mode options, configuration, bomb names, pickup glyphs, and cosmetics.
- `src/game/grid.ts`: seeded RNG, dimension validation, deterministic generation, and reusable A* search. No Three.js dependency.
- `src/game/engine.ts`: authoritative simulation: movement, collision, bombs, blast propagation, pickups, abilities, combat, bots, terrain, boss, scoring, and lifecycle. No React or Three.js dependency.
- `src/hooks/useSimulation.ts`: requestAnimationFrame driver, 60 Hz fixed steps, key state, one-shot action buffers, automatic blur pause, and title-screen demonstration. Large frame gaps are capped to avoid a spiral of death.
- `src/game/Scene.tsx`: independent frame interpolation, shared asset loading, instanced floor tiles, themed props, characters, bombs, flames, pickups, particles, lights, and camera.
- `src/game/audio.ts`: user-gesture initialization, procedural music moods, bounded synthesized voices, and sound effects.
- `src/store.ts`: Zustand menu/configuration/settings, version-one local save, economy, challenges, result rewards, and current Game reference.
- `src/ui/`: separate screens for home, match setup, characters, customization, shop, records, settings, gameplay HUD, and shared interface elements.
- `src/styles.css`: responsive typography, layout, menu transitions, HUD, dialogs, and reduced-motion CSS.

The simulation mutates its own objects instead of using React setters at 60 Hz. The HUD refreshes approximately twelve times per second and arena entity lists twenty times per second; character motion interpolates in the render loop. Static floor geometry uses instancing. Asset geometries and textures are cached by the R3F loader. Rendering does not determine damage.

## State transitions

Screens: `home`, `setup`, `characters`, `customize`, `shop`, `records`, `settings`, `leaderboard`, `match`.

Match phases: `intro → playing ↔ paused → finished`. A fresh Game is created for each start and rematch. Finished results commit rewards exactly once via the Game completion callback. Title-screen demo Games have no reward callback. Returning to home discards the previous match and creates a separate demo. Opening settings during a match pauses it, and the settings Back button returns to the paused match.

## Persistence

Local storage key: `bombastic-save-v1`. Save contains selected character, appearance, owned/equipped cosmetics, coins, XP, statistics, achievement IDs, challenge claims, settings, bindings, tutorial completion, and recent seeds. Loading merges defaults, validates numeric values, identifiers, colors, and bindings, and rejects unknown schema versions. Storage failure does not stop gameplay. Saves are specific to the browser origin, including port. No account or cloud sync exists.

## Adding content

Add a character definition with an existing ability behavior and matching rendering details. New ability behavior belongs in `Game.ability`. Add bomb IDs and descriptions in definitions and implement distinct blast/status behavior in the engine before exposing the pickup. Add cosmetic metadata and its matching mesh/equip branch. Add biomes in definitions, then provide distinct obstacles, props, terrain presentation, and any mechanics. Keep new simulation behaviors covered by engine tests.

## Asset pipeline

The user-provided `.unitypackage` was extracted into ignored `.reference/kubikos`. The extraction script locates original assets by package path. The preparation script reads selected FBX files with Three.js, bakes world transforms, merges and normalizes geometry, and writes runtime BufferGeometry JSON. It resizes textures to at most 1024 pixels and encodes WebP with sharp. Source copies and the full package extraction remain outside the production bundle. Browsers load only local JSON geometry and compressed textures.

## Validation and deployment

Vitest runs pure simulation and save/economy checks without a WebGL context. Strict TypeScript and Vite produce `dist`. Production chunks separate Three.js, the React Three Fiber runtime, and application logic. Static hosting supports ordinary gameplay. The local Node server serves `dist` plus SQLite rankings; Vercel Functions serve ranked endpoints with Upstash Redis storage. Asset licensing still applies to public distribution.

## Sky Riot and hosting

`WorldDetails.tsx` renders swaying trees, shader water, waterfalls, stair steps, warning tiles and ambient particles. Tile levels drive all entity elevations and walk/blast legality. `Game.control` is the common fixed-step input interface; ranked runs record those inputs. `ranking.ts` supplies fixed rules, independent replay verification and server score calculation.

`server/index.ts` is a bundled local Node/SQLite HTTP server. `server/cloud.ts` implements the cloud Web Request/Response service; `api/` exposes it as Vercel Functions. Cloud POST rates use Redis, sessions have one-hour TTLs, and Lua atomically consumes a session while updating best-score sorted sets and entry hashes. Cloud functions never import local SQLite code. Environment credentials stay server-only.

`.github/workflows/ci.yml` runs locked dependency installation, tests and strict builds with read-only permissions. `vercel.json` selects Vite, `dist` and 30-second API limits. `.env.example` documents names only.
