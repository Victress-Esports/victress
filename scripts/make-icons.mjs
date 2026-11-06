// Builds every logo and icon raster from the ORIGINAL technology-wings artwork (public/brand/wings.webp).
// Nothing is redrawn: each file is a crop, resize or flat-color rendering of that artwork's own silhouette.
//   public/brand/wings-emblem-{128,256,512}.webp   standalone emblem, cropped to the wings (transparent)
//   public/brand/victress-lockup.{png,webp}         wings above the VICTRESS wordmark (stacked, for dark backgrounds)
//   public/brand/victress-lockup-horizontal.{png,webp}  wings beside the wordmark
//   app/favicon.ico (16/32/48), app/icon.png (32)   simplified wings favicon
//   app/apple-icon.png (180)                        iOS home-screen icon
//   public/icon-192.png, icon-512.png               web app manifest ("any")
//   public/icon-maskable-512.png                    manifest "maskable" (wings inside the central safe zone)
// The wordmark is set in Space Grotesk Bold (the site's display font); it must be installed as a system font for sharp.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SRC = "public/brand/wings.webp";
const BG = "#171717";
const CRIMSON = "#e0192f"; // a touch brighter than #cf142b so the flat favicon holds up on dark tabs
// The art occupies x 37..986, y 108..858 of the 1024 square. Crop with a few pixels of margin.
const CROP = { left: 30, top: 100, width: 964, height: 765 };
const ASPECT = CROP.width / CROP.height;
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const crop = await sharp(SRC).extract(CROP).png().toBuffer();
const alpha = await sharp(crop).extractChannel(3).toBuffer();

/** Wings at a given pixel width, full detail. */
const detailed = (w) => sharp(crop).resize(w, null, { kernel: "lanczos3" });

/** Simplified wings for tiny sizes: the original silhouette in flat crimson, with the original's light and dark detail laid over it. */
async function simplified(w, detail) {
  const a = await sharp(alpha).resize(w, null, { kernel: "lanczos3" }).toBuffer();
  const h = (await sharp(a).metadata()).height;
  const flat = await sharp({ create: { width: w, height: h, channels: 3, background: CRIMSON } }).png().toBuffer();
  const base = await sharp(flat).joinChannel(a).png().toBuffer();
  if (!detail) return base;
  const d = await sharp(crop).resize(w, h, { kernel: "lanczos3", fit: "fill" }).modulate({ saturation: 1.25, brightness: 1.1 }).sharpen({ sigma: 0.6 }).png().toBuffer();
  // Detail layer at partial opacity over the flat silhouette.
  const faded = await sharp(d).ensureAlpha().linear([1, 1, 1, detail], [0, 0, 0, 0]).png().toBuffer();
  return sharp(base).composite([{ input: faded, blend: "over" }]).png().toBuffer();
}

/** Wings centered on a full-bleed carbon square. `scale` is the wings' width as a fraction of the canvas. */
async function square(size, scale) {
  const wings = await detailed(Math.round(size * scale)).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } }).composite([{ input: wings, gravity: "center" }]).png();
}

// --- Emblem (transparent), cropped to the wings.
for (const w of [128, 256, 512]) await detailed(w).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(`public/brand/wings-emblem-${w}.webp`);

// PNG copy for the social-card renderer (next/og does not read webp).
await detailed(256).png({ compressionLevel: 9 }).toFile("public/brand/wings-emblem-256.png");

// --- Backdrop crops for page compositions (used faint, behind content). Same artwork, only cropped and resized.
//   wings-half-560.webp: the left wing alone (mirror it in CSS for the right). wings-band-1200.webp: the full pair.
await sharp(SRC).extract({ left: 30, top: 100, width: 482, height: 765 }).resize(560, null, { kernel: "lanczos3" }).webp({ quality: 72, alphaQuality: 80, effort: 6 }).toFile("public/brand/wings-half-560.webp");
await detailed(1200).webp({ quality: 68, alphaQuality: 80, effort: 6 }).toFile("public/brand/wings-band-1200.webp");

// --- Lockups (white wordmark, transparent background).
const font = `font-family="Space Grotesk, Inter, sans-serif" font-weight="700"`;
{
  const W = 1600, wingsW = 760, wingsH = Math.round(wingsW / ASPECT), textH = 150, gap = 56, pad = 60;
  const H = pad + wingsH + gap + textH + pad;
  const wings = await detailed(wingsW).png().toBuffer();
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${textH}"><text x="${W / 2 + 14}" y="${textH * 0.78}" text-anchor="middle" fill="#ffffff" ${font} font-size="140" letter-spacing="28">VICTRESS</text></svg>`);
  const buf = await sharp({ create: { width: W, height: H, channels: 4, background: CLEAR } })
    .composite([
      { input: wings, left: Math.round((W - wingsW) / 2), top: pad },
      { input: text, left: 0, top: pad + wingsH + gap },
    ])
    .png()
    .toBuffer();
  writeFileSync("public/brand/victress-lockup.png", await sharp(buf).png({ compressionLevel: 9 }).toBuffer());
  await sharp(buf).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile("public/brand/victress-lockup.webp");
}
{
  const wingsH = 300, wingsW = Math.round(wingsH * ASPECT), W = 1800, H = 400, pad = 50;
  const wings = await detailed(wingsW).png().toBuffer();
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W - wingsW - pad * 2 - 40}" height="${H}"><text x="0" y="${H * 0.62}" fill="#ffffff" ${font} font-size="190" letter-spacing="34">VICTRESS</text></svg>`);
  const buf = await sharp({ create: { width: W, height: H, channels: 4, background: CLEAR } })
    .composite([
      { input: wings, left: pad, top: Math.round((H - wingsH) / 2) },
      { input: text, left: pad + wingsW + 40, top: 0 },
    ])
    .png()
    .toBuffer();
  writeFileSync("public/brand/victress-lockup-horizontal.png", await sharp(buf).png({ compressionLevel: 9 }).toBuffer());
  await sharp(buf).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile("public/brand/victress-lockup-horizontal.webp");
}

// --- Favicon: transparent, so it reads on light and dark browser chrome. 16 is flat; 32 and 48 keep some of the original detail.
const SIZES = [16, 32, 48];
const detail = { 16: 0, 32: 0.45, 48: 0.55 };
const frames = [];
for (const s of SIZES) {
  const w = await simplified(s, detail[s]);
  frames.push(await sharp({ create: { width: s, height: s, channels: 4, background: CLEAR } }).composite([{ input: w, gravity: "center" }]).png().toBuffer());
}
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
SIZES.forEach((s, i) => {
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
writeFileSync("app/icon.png", frames[1]); // 32x32, served as <link rel="icon" type="image/png" sizes="32x32">

// --- Square app icons.
await (await square(180, 0.78)).toFile("app/apple-icon.png");
await (await square(192, 0.8)).toFile("public/icon-192.png");
await (await square(512, 0.8)).toFile("public/icon-512.png");
await (await square(512, 0.56)).toFile("public/icon-maskable-512.png"); // inside the 80% safe circle
console.log("wrote emblem webps, lockups, favicon.ico (16/32/48), icon.png, apple-icon.png, icon-192/512, icon-maskable-512");
