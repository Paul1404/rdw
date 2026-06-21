import { copyFile, mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";

await mkdir("public/brand", { recursive: true });

await Promise.all([
  copyFile("RDW-brand/svg/rdw-icon.svg", "public/brand/rdw-icon.svg"),
  copyFile("RDW-brand/svg/rdw-icon-mono.svg", "public/brand/rdw-icon-mono.svg"),
  copyFile("RDW-brand/svg/rdw-mark-indigo.svg", "public/brand/rdw-mark-indigo.svg"),
  copyFile("RDW-brand/svg/rdw-mark-white.svg", "public/brand/rdw-mark-white.svg"),
  copyFile("RDW-brand/svg/rdw-lockup-light.svg", "public/brand/rdw-lockup-light.svg"),
  copyFile("RDW-brand/svg/rdw-lockup-dark.svg", "public/brand/rdw-lockup-dark.svg"),
  copyFile("RDW-brand/svg/rdw-favicon.svg", "public/favicon.svg"),
]);

const iconSvg = await readFile("RDW-brand/svg/rdw-icon.svg");
const faviconSvg = await readFile("RDW-brand/svg/rdw-favicon.svg");

await Promise.all([
  sharp(faviconSvg).resize(16, 16).png().toFile("public/favicon-16.png"),
  sharp(faviconSvg).resize(32, 32).png().toFile("public/favicon-32.png"),
  sharp(faviconSvg).resize(48, 48).png().toFile("public/favicon.ico"),
  sharp(iconSvg).resize(180, 180).png().toFile("public/apple-touch-icon.png"),
  sharp(iconSvg).resize(192, 192).png().toFile("public/icon-192.png"),
  sharp(iconSvg).resize(512, 512).png().toFile("public/icon-512.png"),
]);

console.info("icons generated");
