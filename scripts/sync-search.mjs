import { cpSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../dist/pagefind/", import.meta.url));
const destination = fileURLToPath(
  new URL("../public/pagefind/", import.meta.url)
);

if (!existsSync(source)) {
  throw new Error("Pagefind index is missing. Build the search index first.");
}

mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
