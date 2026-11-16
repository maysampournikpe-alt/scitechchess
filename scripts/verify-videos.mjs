// Checks every video in src/content/videos.ts through YouTube's public oEmbed endpoint.
// A video that is missing, private, or not embeddable fails. Run before adding or shipping videos:
//   node scripts/verify-videos.mjs
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/content/videos.ts", import.meta.url), "utf8");
const ids = [...src.matchAll(/youtubeId:\s*"([\w-]{11})"/g)].map((m) => m[1]);
if (ids.length === 0) {
  console.log("No videos listed.");
  process.exit(0);
}
let failed = 0;
for (const id of ids) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    console.log(`ok   ${id}  ${j.author_name}: ${j.title}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL ${id}  ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
