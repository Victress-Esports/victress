// Renders app/icon.svg to app/apple-icon.png (180x180) for iOS home screens.
import sharp from "sharp";

await sharp("app/icon.svg", { density: 900 }).resize(180, 180).png().toFile("app/apple-icon.png");
console.log("wrote app/apple-icon.png");
