import { fileURLToPath } from "node:url";
import sharp from "sharp";

const destination = fileURLToPath(
  new URL("../public/social-card.png", import.meta.url)
);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f8fafc" />
  <rect x="0" y="0" width="16" height="630" fill="#0f766e" />
  <text x="100" y="160" font-family="sans-serif" font-size="24" letter-spacing="5" fill="#0f766e">TECH NOTES</text>
  <text x="96" y="330" font-family="sans-serif" font-size="104" font-weight="700" fill="#172033">bigStrongK</text>
  <text x="100" y="405" font-family="sans-serif" font-size="32" fill="#526174">Code. Debug. Learn.</text>
  <path d="M100 472h1000" stroke="#dbe4e8" stroke-width="2" />
  <text x="100" y="532" font-family="monospace" font-size="24" fill="#526174">bigstrongk.github.io</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(destination);
