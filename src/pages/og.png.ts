import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const GET: APIRoute = async () => {
  const image = await readFile(resolve("public/social-card.png"));
  return new Response(new Uint8Array(image), {
    headers: { "Content-Type": "image/png" },
  });
};
