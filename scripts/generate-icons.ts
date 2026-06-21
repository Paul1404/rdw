import { readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile("public/favicon.svg");

await Promise.all([
  sharp(svg).resize(16, 16).png().toFile("public/favicon-16.png"),
  sharp(svg).resize(32, 32).png().toFile("public/favicon-32.png"),
  sharp(svg).resize(180, 180).png().toFile("public/apple-touch-icon.png"),
  sharp(svg).resize(192, 192).png().toFile("public/icon-192.png"),
  sharp(svg).resize(512, 512).png().toFile("public/icon-512.png"),
  sharp(svg).resize(48, 48).png().toFile("public/favicon.ico"),
]);

console.info("icons generated");
