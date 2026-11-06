// Renders app/icon.svg into every raster icon we ship:
//   app/apple-icon.png   180x180  (iOS home screen, <link rel="apple-touch-icon">)
//   app/favicon.ico      48x48    (legacy crawlers and browsers; a PNG wrapped in an ICO container)
//   public/icon-192.png, public/icon-512.png  (web app manifest)
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const png = (size) => sharp("app/icon.svg", { density: 1200 }).resize(size, size).png().toBuffer();

await sharp("app/icon.svg", { density: 900 }).resize(180, 180).png().toFile("app/apple-icon.png");
await sharp("app/icon.svg", { density: 1200 }).resize(192, 192).png().toFile("public/icon-192.png");
await sharp("app/icon.svg", { density: 1200 }).resize(512, 512).png().toFile("public/icon-512.png");

const data = await png(48);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // one image
header.writeUInt8(48, 6); // width
header.writeUInt8(48, 7); // height
header.writeUInt16LE(1, 10); // planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(data.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
writeFileSync("app/favicon.ico", Buffer.concat([header, data]));
console.log("wrote apple-icon.png, favicon.ico, icon-192.png, icon-512.png");
