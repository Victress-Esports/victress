// Renders app/icon.svg (the approved simple V) into every raster icon we ship. The glyph itself is not changed here.
//   app/apple-icon.png   180x180  full-bleed square (iOS rounds the corners itself; transparent corners show as black)
//   app/favicon.ico      16, 32 and 48 px frames (PNG frames in an ICO container)
//   public/icon-192.png, public/icon-512.png        web app manifest ("any")
//   public/icon-maskable-512.png                    web app manifest ("maskable": V inside the central safe zone)
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const V = readFileSync("app/icon.svg", "utf8").match(/<g fill="#fff"[\s\S]*<\/g>(?=<\/svg>)/)[0];
const BG = "#171717";
// Same V, drawn on a full-bleed square. `scale` is the size of the V relative to the canvas.
const square = (scale) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${BG}"/>` +
      V.replace(/transform="translate\(4 4\) scale\(0\.75\)"/, `transform="translate(${((1 - scale) * 16).toFixed(2)} ${((1 - scale) * 16).toFixed(2)}) scale(${scale})"`) +
      `</svg>`,
  );
const render = (svg, size) => sharp(svg, { density: 1200 }).resize(size, size).png();

await render(square(0.75), 180).toFile("app/apple-icon.png");
await sharp("app/icon.svg", { density: 1200 }).resize(192, 192).png().toFile("public/icon-192.png");
await sharp("app/icon.svg", { density: 1200 }).resize(512, 512).png().toFile("public/icon-512.png");
await render(square(0.58), 512).toFile("public/icon-maskable-512.png"); // V stays inside the 80% safe circle

// Multi-size ICO: 16, 32, 48.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map((s) => sharp("app/icon.svg", { density: 1200 }).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(frames[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += frames[i].length;
});
writeFileSync("app/favicon.ico", Buffer.concat([header, ...frames]));
console.log("wrote apple-icon.png, favicon.ico (16/32/48), icon-192.png, icon-512.png, icon-maskable-512.png");
