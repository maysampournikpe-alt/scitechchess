// Builds public/data/puzzles.json from the full Lichess puzzle database (CC0).
//
// Run with PUZZLES_DOWNLOAD=1 (on a machine or build with internet access). It streams the ~250 MB
// compressed CSV, keeps well-rated puzzles (popular, often played, stable rating), picks a
// reproducible spread across ratings and themes, and checks every kept puzzle with chess.js.
// If anything fails (no network, bad data), the committed file is left untouched and the
// build continues: the app always has a valid puzzle set.
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { Decompress } from "fzstd";
import { Chess } from "chess.js";

const SOURCE = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const OUT = new URL("../public/data/puzzles.json", import.meta.url);
const PER_BAND = Number(process.env.PUZZLES_PER_BAND ?? 600); // 100-point rating bands
const MIN_PER_THEME = 150;
// Themes the trainer offers by name (src/lib/learning/select.ts): make sure each has enough puzzles.
const THEMES = readFileSync(new URL("../src/lib/learning/select.ts", import.meta.url), "utf8").match(/id: "(\w+)"/g).map((m) => m.slice(5, -1));

// Manual only: the import takes about 7 minutes, too long for every deploy. The result is committed.
const enabled = process.env.PUZZLES_DOWNLOAD === "1";
if (!enabled) {
  console.log("[puzzles] skipped: set PUZZLES_DOWNLOAD=1 to rebuild from the Lichess database");
  process.exit(0);
}

// FNV-1a: a stable pseudo-random order, so the same database gives the same selection.
const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};

function valid(fen, moves, themes) {
  try {
    const c = new Chess(fen);
    for (const u of moves.split(" ")) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    if (moves.split(" ").length % 2 !== 0) return false;
    if (themes.includes("mate") && !c.isCheckmate()) return false;
    return true;
  } catch {
    return false;
  }
}

/** Keeps the `cap` items with the lowest hash, using O(cap) memory however many are offered. */
class Lowest {
  constructor(cap) {
    this.cap = cap;
    this.items = [];
  }
  offer(p) {
    this.items.push(p);
    if (this.items.length >= this.cap * 2) this.trim();
  }
  trim() {
    this.items.sort((a, b) => a[5] - b[5]);
    this.items.length = Math.min(this.items.length, this.cap);
    return this.items;
  }
}

async function main() {
  const t0 = Date.now();
  const res = await fetch(SOURCE);
  if (!res.ok || !res.body) throw new Error(`download failed: HTTP ${res.status}`);
  const bands = new Map();
  const themes = new Map(THEMES.map((t) => [t, new Lowest(MIN_PER_THEME)]));
  let rest = "";
  let rows = 0;
  let header = true;
  const onText = (text) => {
    const lines = (rest + text).split("\n");
    rest = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      if (header) {
        header = false;
        continue;
      }
      rows++;
      const [id, fen, moves, rating, dev, pop, plays, tags] = line.split(",");
      if (Number(dev) > 80 || Number(pop) < 85 || Number(plays) < 1000) continue;
      const r = Number(rating);
      const p = [id, fen, moves, r, tags, hash(id)];
      const band = Math.floor(r / 100);
      if (!bands.has(band)) bands.set(band, new Lowest(PER_BAND));
      bands.get(band).offer(p);
      for (const t of tags.split(" ")) themes.get(t)?.offer(p);
    }
  };
  const td = new TextDecoder();
  const zs = new Decompress((chunk) => onText(td.decode(chunk, { stream: true })));
  for await (const chunk of Readable.fromWeb(res.body)) zs.push(chunk);
  zs.push(new Uint8Array(0), true);
  onText("\n");
  console.log(`[puzzles] read ${rows} puzzles in ${Math.round((Date.now() - t0) / 1000)} s`);

  const picked = new Map();
  for (const l of [...bands.values(), ...themes.values()]) for (const p of l.trim()) picked.set(p[0], p);
  const out = [...picked.values()].filter((p) => valid(p[1], p[2], p[4])).sort((a, b) => a[3] - b[3] || (a[0] < b[0] ? -1 : 1)).map((p) => [p[0], p[1], p[2], p[3], p[4]]);
  if (out.length < 5000) throw new Error(`only ${out.length} puzzles passed; keeping the committed set`);
  const tmp = OUT.pathname + ".tmp";
  writeFileSync(tmp, JSON.stringify(out));
  renameSync(tmp, OUT);
  console.log(`[puzzles] wrote ${out.length} puzzles (${bands.size} rating bands)`);
  console.log(`[puzzles] per theme: ${THEMES.map((t) => `${t}=${out.filter((p) => p[4].split(" ").includes(t)).length}`).join(" ")}`);
}

main().catch((e) => {
  console.warn(`[puzzles] ${e.message}. Keeping the committed puzzle set.`);
  process.exit(0);
});
