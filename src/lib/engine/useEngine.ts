"use client";
import { useEffect, useState } from "react";
import { getEngine } from "./browser";
import type { UciClient } from "./uci";

/** Loads Stockfish when the component mounts. `error` is set if the browser cannot run it. */
export function useEngine(): { engine: UciClient | null; error: string } {
  const [engine, setEngine] = useState<UciClient | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    getEngine().then(
      (e) => live && setEngine(e),
      (e) => live && setError(String(e?.message ?? e)),
    );
    return () => {
      live = false;
    };
  }, []);
  return { engine, error };
}
