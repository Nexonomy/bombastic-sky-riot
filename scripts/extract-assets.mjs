import fs from "node:fs";
import path from "node:path";
const root = ".reference/kubikos";
const entries = fs.readdirSync(root).flatMap((id) => {
  const p = path.join(root, id, "pathname");
  return fs.existsSync(p)
    ? [{ id, path: fs.readFileSync(p, "utf8").trim() }]
    : [];
});
fs.writeFileSync(".reference/index.json", JSON.stringify(entries, null, 2));
fs.mkdirSync("public/assets", { recursive: true });
fs.mkdirSync(".reference/asset-sources", { recursive: true });
const wanted = {
  "Cube.fbx": "cube.fbx",
  "Tree_3.fbx": "tree.fbx",
  "Box.fbx": "crate.fbx",
  "Barrel.fbx": "barrel.fbx",
  "Rock_3.fbx": "rock.fbx",
  "TreesAndPlants_D.png": "foliage.png",
  "Items_D.png": "items.png",
  "SoilWGrass_1_D.png": "soil.png",
  "GroundWGrass_D.png": "grass.png",
  "Stone2_D.png": "stone.png",
  "Wood_Normal_D.png": "wood.png",
  "Rock_2_D.png": "rock.png",
};
for (const [name, out] of Object.entries(wanted)) {
  const e = entries.find((x) =>
    name === "Cube.fbx"
      ? x.path.endsWith("/Models/Cube.fbx")
      : x.path.endsWith("/" + name),
  );
  if (e) {
    fs.copyFileSync(
      path.join(root, e.id, "asset"),
      path.join(".reference/asset-sources", out),
    );
    console.log(e.path, "->", out);
  }
}
fs.writeFileSync(
  "public/assets/NOTICE.txt",
  "Environment meshes and textures extracted from the user-supplied KUBIKOS World Unity package by ANIMAL. These assets remain subject to their original license. Do not redistribute this project or its assets without the appropriate asset license. Original BOMBASTIC characters, UI, gameplay and procedural audio created for this project.",
);
