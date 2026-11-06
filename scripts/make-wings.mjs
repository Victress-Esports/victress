// Removes the white background from public/brand/wings.jpg by flood-filling from the edges,
// then writes transparent WebP files used for the hero and large surfaces.
import sharp from "sharp";

const SRC = "public/brand/wings.jpg";
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const isBg = (i) => data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238;
const seen = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
while (stack.length) {
  const p = stack.pop();
  if (seen[p] || !isBg(p * 4)) continue;
  seen[p] = 1;
  const x = p % w, y = (p / w) | 0;
  if (x > 0) stack.push(p - 1);
  if (x < w - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - w);
  if (y < h - 1) stack.push(p + w);
}
for (let p = 0; p < w * h; p++) if (seen[p]) data[p * 4 + 3] = 0;
// soften the cut edge by one pixel
const out = Buffer.from(data);
for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
  const p = y * w + x;
  if (seen[p]) continue;
  if (seen[p - 1] || seen[p + 1] || seen[p - w] || seen[p + w]) out[p * 4 + 3] = 150;
}
const base = sharp(out, { raw: { width: w, height: h, channels: 4 } });
await base.clone().webp({ quality: 88, alphaQuality: 90 }).toFile("public/brand/wings.webp");
await base.clone().resize(640).webp({ quality: 85 }).toFile("public/brand/wings-640.webp");
console.log("wrote wings.webp and wings-640.webp");
