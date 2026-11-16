"use client";
import { UciClient } from "./uci";

/**
 * Loads Stockfish (WebAssembly, single-threaded "lite" build, about 1.9 MB) in a Web Worker,
 * the first time something needs it. Nothing is downloaded until then, and searches never
 * run on the main thread.
 */
let ready: Promise<UciClient> | null = null;

export function getEngine(): Promise<UciClient> {
  if (!ready) {
    ready = new Promise<UciClient>((resolve, reject) => {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const worker = new Worker(`${base}/engine/stockfish-19-lite-single.js`);
      const client = new UciClient((cmd) => worker.postMessage(cmd));
      worker.onmessage = (e) => client.receive(String(e.data));
      worker.onerror = (e) => {
        ready = null;
        reject(new Error(e.message || "The chess engine could not be loaded"));
      };
      client.init().then(() => resolve(client));
    });
  }
  return ready;
}
