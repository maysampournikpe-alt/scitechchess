"use client";
import Link from "next/link";
import { useState } from "react";
import { Feedback, PageHeader, Ready } from "@/components/ui";
import { useStore } from "@/lib/store/store";

const SOURCE_URL = "https://github.com/maysampournikpe-alt/scitechchess";

function Settings() {
  const settings = useStore((s) => s.settings);
  const set = useStore((s) => s.setSettings);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const reset = useStore((s) => s.reset);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  function download() {
    const blob = new Blob([exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chessmastery-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function upload(file: File) {
    if (file.size > 20_000_000) return setMsg({ tone: "bad", text: "That file is too large to be a ChessMastery export." });
    const ok = importData(await file.text());
    setMsg(ok ? { tone: "good", text: "Your data was imported." } : { tone: "bad", text: "That file is not a ChessMastery export. Nothing was changed." });
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <section className="card grid gap-4 p-5">
        <h2 className="text-2xl">Display and engine</h2>
        <fieldset>
          <legend className="font-semibold">Theme</legend>
          <div className="mt-2 flex gap-2">
            {(["dark", "light"] as const).map((t) => (
              <label key={t} className="choice w-auto" aria-checked={settings.theme === t}>
                <input type="radio" name="theme" className="sr-only" checked={settings.theme === t} onChange={() => set({ theme: t })} />
                {t === "dark" ? "Dark" : "Light"}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-semibold">Board colours</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["blue", "green", "wood"] as const).map((b) => (
              <label key={b} className="choice w-auto" aria-checked={settings.board === b}>
                <input type="radio" name="board" className="sr-only" checked={settings.board === b} onChange={() => set({ board: b })} />
                {b[0].toUpperCase() + b.slice(1)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.sound} onChange={(e) => set({ sound: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
          Play a sound when a move is made
        </label>
        <div>
          <label htmlFor="depth" className="font-semibold">
            Analysis depth: <span className="num">{settings.engineDepth}</span>
          </label>
          <input id="depth" type="range" min={8} max={22} value={settings.engineDepth} onChange={(e) => set({ engineDepth: Number(e.target.value) })} className="mt-2 block w-full max-w-sm accent-[var(--accent)]" />
          <p className="text-sm text-muted">Lower is faster and easier on older laptops and phones. Game reviews use at most 14.</p>
        </div>
        <Link href="/onboarding/" className="btn self-start">
          Change goal, time, rating or learning style
        </Link>
      </section>

      <section className="card grid gap-3 p-5">
        <h2 className="text-2xl">Your data</h2>
        <p className="text-muted">Everything is stored only in this browser. There is no account and nothing is sent to a server. Export a file to keep a backup or move to another device.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={download}>
            Export my data
          </button>
          <label className="btn">
            Import a file
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {!confirming ? (
            <button className="btn btn-quiet text-bad" onClick={() => setConfirming(true)}>
              Delete all my data
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span>This cannot be undone.</span>
              <button
                className="btn border-bad text-bad"
                onClick={() => {
                  reset();
                  setConfirming(false);
                  setMsg({ tone: "good", text: "All your data was deleted from this browser." });
                }}
              >
                Yes, delete everything
              </button>
              <button className="btn btn-quiet" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </span>
          )}
        </div>
        {msg && <Feedback tone={msg.tone}>{msg.text}</Feedback>}
      </section>

      <section id="licenses" className="card grid gap-2 p-5">
        <h2 className="text-2xl">Licences and source code</h2>
        <p>ChessMastery is free software under the GNU General Public License, version 3 or later. You may copy, change and share it under those terms.</p>
        <p>
          Source code:{" "}
          <a className="underline" href={SOURCE_URL}>
            {SOURCE_URL}
          </a>
        </p>
        <ul className="mt-2 grid gap-1 text-sm text-muted">
          <li>
            Stockfish 19 (WebAssembly build by the stockfish.js project), GPL-3.0. Source: github.com/official-stockfish/Stockfish and github.com/nmrugg/stockfish.js.{" "}
            <a className="underline" href="/engine/COPYING.txt">
              Licence text
            </a>
          </li>
          <li>Chessground board by Lichess, GPL-3.0-or-later.</li>
          <li>chess.js, BSD-2-Clause.</li>
          <li>Puzzles: Lichess puzzle database (selection via the daily-chess-puzzle project), CC0.</li>
          <li>Opening names: lichess-org/chess-openings, CC0.</li>
          <li>Endgame results: Lichess tablebase API, queried live when available.</li>
          <li>Fonts: Fraunces and Figtree, SIL Open Font License.</li>
        </ul>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Ready>
      <PageHeader title="Settings" />
      <Settings />
    </Ready>
  );
}
