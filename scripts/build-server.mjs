import { build } from "esbuild";
await build({
  entryPoints: ["server/index.ts"],
  outfile: "server-dist/index.mjs",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
});
