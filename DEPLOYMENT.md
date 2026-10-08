# Hosting BOMBASTIC

## Personal GitHub repository

The public repository is owned by the `Nexonomy` personal account. Source, runtime assets, locked dependencies, tests, CI and Vercel configuration are included. KUBIKOS assets retain their original license; see `public/assets/NOTICE.txt`. Local databases, generated builds, private artifacts, authentication files, credentials and `.reference/` are excluded. The curated game screenshot in `docs/visuals/` is included for the repository showcase.

## Vercel import

Import the personal repository into Vercel. `vercel.json` sets:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Install | `npm ci` |
| Build | `npm run build` |
| Output | `dist` |
| Node.js | 22.x |
| Ranked API duration | 30 seconds |

The frontend uses relative `/api` URLs. The four TypeScript files in `api/` are native Node.js Vercel Functions with Web Request/Response handlers. Functions import the same simulation used by the browser. SQLite is used only by the standalone local server.

## Persistent cloud storage

Connect Upstash Redis through Vercel Storage/Marketplace, choosing the plan yourself. Configure these **server-only** variables for Production and Preview:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Redeploy after adding them. Without storage, ordinary play works and ranked requests return 503. `/api/health` returns 200 only after Redis responds. Never prefix credentials with `VITE_`, put them in source, or commit a populated `.env` file.

Optional: `LEADERBOARD_NAMESPACE` isolates another environment. Production defaults to `bombastic:v2`; Vercel previews use separate branch namespaces. `PUBLIC_ORIGIN` can allow an additional exact POST origin; same-origin requests work automatically.

## Verification and data

The server ignores supplied score values, validates bounded fixed-step inputs and calculates the result. Redis Lua atomically consumes the one-hour session and updates daily/all-time best scores. Rate counters are shared across function instances. The local server uses SQLite transactions with the same replay rules.

Players have anonymous local IDs, not authenticated accounts. Clearing local storage creates another identity. Valid automated recordings are possible. Names and scores are shared when a player submits Results. Browser appearance and ordinary progression stay local.

GitHub Actions installs locked dependencies, runs tests and builds both TypeScript targets plus the production frontend. It has read permission only; Vercel Git integration handles deployment without CI deployment secrets.

After connecting cloud storage and deploying, verify `/api/health`, a complete ranked match, score submission, and the same board from another browser. The project has not been publicly deployed until that setup is completed.

## Local server

`npm run build && npm start` serves the game on port 4174 and persists scores in ignored `data/rankings.sqlite`. `PORT` and `DATA_DIR` customize the standalone server. Do not upload this database to Vercel.
