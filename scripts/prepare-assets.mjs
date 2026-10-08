import fs from "node:fs";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TextureLoader, Texture, Box3, Vector3 } from "three";
TextureLoader.prototype.load = function () {
  return new Texture();
};
for (const name of ["tree", "crate", "barrel", "rock", "cube"]) {
  const data = fs.readFileSync(`.reference/asset-sources/${name}.fbx`);
  const object = new FBXLoader().parse(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    "",
  );
  object.updateMatrixWorld(true);
  const geometries = [];
  object.traverse((m) => {
    if (m.isMesh) {
      const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
      for (const key of Object.keys(g.attributes))
        if (!["position", "normal", "uv"].includes(key)) g.deleteAttribute(key);
      geometries.push(g.index ? g.toNonIndexed() : g);
    }
  });
  const geometry = mergeGeometries(geometries);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = box.getSize(new Vector3()),
    center = box.getCenter(new Vector3());
  geometry.translate(-center.x, -box.min.y, -center.z);
  const s =
    (name === "tree"
      ? 2.9
      : name === "crate"
        ? 0.82
        : name === "barrel"
          ? 0.9
          : name === "cube"
            ? 1
            : 0.9) /
    (name === "tree" ? size.y : Math.max(size.x, size.y, size.z));
  geometry.scale(s, s, s);
  fs.writeFileSync(
    `public/assets/${name}.json`,
    JSON.stringify(geometry.toJSON()),
  );
  console.log(name, size.toArray(), geometry.attributes.position.count);
}
const { default: sharp } = await import("sharp");
for (const name of [
  "foliage",
  "items",
  "soil",
  "grass",
  "stone",
  "wood",
  "rock",
]) {
  await sharp(`.reference/asset-sources/${name}.png`)
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toFile(`public/assets/${name}.webp`);
}
