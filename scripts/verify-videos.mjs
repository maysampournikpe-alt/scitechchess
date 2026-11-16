// Verifies src/content/video-candidates.ts through YouTube's public oEmbed endpoint and writes
// the confirmed ones to public/data/videos.json, using the title and channel YouTube returns.
// Runs before `next build` on Vercel (or with VIDEOS_VERIFY=1). Without network access the
// committed file is kept, so the build never fails because of this step.
import { readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../public/data/videos.json", import.meta.url);
const enabled = process.env.VIDEOS_VERIFY === "1" || process.env.VERCEL === "1";
if (!enabled) {
  console.log("[videos] skipped: set VIDEOS_VERIFY=1 to verify against YouTube");
  process.exit(0);
}

const src = readFileSync(new URL("../src/content/video-candidates.ts", import.meta.url), "utf8");
const candidates = [...src.matchAll(/\{ youtubeId: "([\w-]{11})", topic: "([^"]+)", practiceHref: "([^"]+)", level: "(\w+)" \}/g)].map((m) => ({ youtubeId: m[1], topic: m[2], practiceHref: m[3], level: m[4] }));

const ok = [];
let reached = false;
for (const c of candidates) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${c.youtubeId}`)}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    reached = true;
    if (!r.ok) {
      console.log(`[videos] drop ${c.youtubeId}: HTTP ${r.status}`);
      continue;
    }
    const j = await r.json();
    if (typeof j.title !== "string" || typeof j.author_name !== "string") continue;
    ok.push({ ...c, title: j.title, channel: j.author_name, verifiedAt: new Date().toISOString().slice(0, 10) });
    console.log(`[videos] ok   ${c.youtubeId}: ${j.author_name} | ${j.title}`);
  } catch (e) {
    console.log(`[videos] skip ${c.youtubeId}: ${e.message}`);
  }
}
if (!reached) {
  console.warn("[videos] YouTube not reachable. Keeping the committed list.");
  process.exit(0);
}
writeFileSync(OUT, JSON.stringify(ok, null, 1));
console.log(`[videos] ${ok.length} of ${candidates.length} candidates verified`);
