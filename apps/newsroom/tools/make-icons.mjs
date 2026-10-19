/**
 * Regenerates the Newsroom app icons in public/ (favicon, home-screen and install icons, manifest).
 *   pnpm --filter @news/newsroom icons
 * Uses the system Edge/Chrome through playwright-core, so no browser download is needed.
 * The Newsroom is a dark tile with a blue bar, so staff can tell it apart from the blue Reader icon.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(out, { recursive: true });

const INK = "#1b1d2b";
const BLUE = "#3c63ed";
// The N and the bar sit inside the central 60%, inside the maskable safe zone.
const mark = (size, radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="${radius}" fill="${INK}"/><path d="M21 42V18h5l12 16V18h5v24h-5L26 26v16z" fill="#fff"/><rect x="21" y="45.5" width="22" height="3.5" rx="1.75" fill="${BLUE}"/></svg>`;

writeFileSync(join(out, "favicon.svg"), mark(64, 14) + "\n");

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
for (const [name, size, radius] of [["favicon-32.png", 32, 14], ["apple-touch-icon.png", 180, 0], ["icon-192.png", 192, 0], ["icon-512.png", 512, 0]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${mark(size, radius)}</body>`);
  await page.screenshot({ path: join(out, name), omitBackground: radius > 0 });
}
await browser.close();

writeFileSync(
  join(out, "manifest.webmanifest"),
  JSON.stringify(
    {
      name: "News APP Newsroom",
      short_name: "Newsroom",
      description: "Write, review and publish News APP stories from your phone or computer.",
      id: "./",
      start_url: "./",
      scope: "./",
      display: "standalone",
      orientation: "any",
      background_color: "#ffffff",
      theme_color: INK,
      lang: "en-IN",
      categories: ["news", "productivity"],
      icons: [
        { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [{ name: "Write a story", short_name: "Write", url: "./write", icons: [{ src: "icon-192.png", sizes: "192x192" }] }],
    },
    null,
    2,
  ) + "\n",
);
console.log("icons written to", out);
