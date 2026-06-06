import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const SOURCE = path.join(PUBLIC_DIR, "fishlist-logo.png");

async function ensureSourceExists() {
  try {
    await fs.access(SOURCE);
  } catch {
    throw new Error(`Missing source logo at ${SOURCE}`);
  }
}

async function writePng(outName, size) {
  const outPath = path.join(PUBLIC_DIR, outName);
  const buf = await sharp(SOURCE)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  await fs.writeFile(outPath, buf);
  return { outPath, buf };
}

async function writeIco(outName, sizes) {
  const pngBuffers = await Promise.all(
    sizes.map((s) =>
      sharp(SOURCE).resize(s, s, { fit: "cover" }).png().toBuffer(),
    ),
  );
  const ico = await pngToIco(pngBuffers);
  const outPath = path.join(PUBLIC_DIR, outName);
  await fs.writeFile(outPath, ico);
  return outPath;
}

async function writeManifest() {
  const manifest = {
    name: "FishList",
    short_name: "FishList",
    description: "Track and explore fishing spots",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#131a2a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
  await fs.writeFile(
    path.join(PUBLIC_DIR, "site.webmanifest"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
}

await ensureSourceExists();

// Favicons + app icons that Google/Apple/Chrome commonly look for.
await writePng("icon-32x32.png", 32);
await writePng("icon-192.png", 192);
await writePng("icon-512.png", 512);
await writePng("apple-touch-icon.png", 180);
await writeIco("favicon.ico", [16, 32, 48]);
await writeManifest();

console.log("Generated favicons in ./public");

