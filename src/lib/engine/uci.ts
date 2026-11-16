/** Engine score from the point of view of the side to move. */
export type Score = { cp: number } | { mate: number };

export type Line = {
  multipv: number;
  depth: number;
  score: Score;
  /** Principal variation in UCI moves. */
  pv: string[];
};

/** Parse one UCI "info" line. Returns null for lines without a score and a pv. */
export function parseInfo(line: string): Line | null {
  if (!line.startsWith("info ") || !line.includes(" pv ")) return null;
  const t = line.split(" ");
  const num = (key: string) => {
    const i = t.indexOf(key);
    return i >= 0 ? Number(t[i + 1]) : undefined;
  };
  const si = t.indexOf("score");
  if (si < 0) return null;
  const kind = t[si + 1];
  const value = Number(t[si + 2]);
  if (!Number.isFinite(value) || (kind !== "cp" && kind !== "mate")) return null;
  // "lowerbound"/"upperbound" scores are not exact; skip them.
  if (t[si + 3] === "lowerbound" || t[si + 3] === "upperbound") return null;
  return {
    multipv: num("multipv") ?? 1,
    depth: num("depth") ?? 0,
    score: kind === "cp" ? { cp: value } : { mate: value },
    pv: t.slice(t.indexOf("pv") + 1),
  };
}

export function parseBestMove(line: string): string | null {
  const m = /^bestmove (\S+)/.exec(line);
  return m ? m[1] : null;
}

export type Limits = { depth?: number; movetime?: number; multipv?: number };
export type Analysis = { lines: Line[]; bestmove: string | null };
export type Options = Record<string, string | number | boolean>;

/**
 * Minimal UCI client. It is transport-agnostic: give it a `send` function and call
 * `receive` with every line the engine prints. In the browser the transport is a Web Worker
 * (see browser.ts); in tests it is the Node build of the same engine.
 * Requests are queued, so only one search runs at a time.
 */
export class UciClient {
  private queue: Promise<unknown> = Promise.resolve();
  private onLine: ((line: string) => void) | null = null;
  private applied: Options = {};

  constructor(private send: (cmd: string) => void) {}

  receive(line: string) {
    this.onLine?.(line);
  }

  private wait<T>(start: () => void, handle: (line: string, done: (v: T) => void) => void): Promise<T> {
    const run = () =>
      new Promise<T>((resolve) => {
        this.onLine = (line) =>
          handle(line, (v) => {
            this.onLine = null;
            resolve(v);
          });
        start();
      });
    const p = this.queue.then(run, run);
    this.queue = p;
    return p;
  }

  init(): Promise<void> {
    return this.wait<void>(
      () => this.send("uci"),
      (line, done) => line === "uciok" && done(),
    ).then(() =>
      this.wait<void>(
        () => this.send("isready"),
        (line, done) => line === "readyok" && done(),
      ),
    );
  }

  private setOptions(options: Options) {
    for (const [name, value] of Object.entries(options)) {
      if (this.applied[name] === value) continue;
      this.applied[name] = value;
      this.send(`setoption name ${name} value ${value}`);
    }
  }

  /** Search a position. Scores are from the side to move's point of view. */
  search(fen: string, limits: Limits, options: Options = {}): Promise<Analysis> {
    const lines = new Map<number, Line>();
    return this.wait<Analysis>(
      () => {
        this.setOptions({ MultiPV: limits.multipv ?? 1, ...options });
        this.send(`position fen ${fen}`);
        const go = [limits.depth ? `depth ${limits.depth}` : "", limits.movetime ? `movetime ${limits.movetime}` : ""].join(" ").trim();
        this.send(`go ${go || "depth 12"}`);
      },
      (line, done) => {
        const info = parseInfo(line);
        if (info) lines.set(info.multipv, info);
        const best = parseBestMove(line);
        if (best !== null)
          done({
            lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv),
            bestmove: best === "(none)" ? null : best,
          });
      },
    );
  }

  /** Ask a running search to finish now. The pending promise resolves with what was found. */
  stop() {
    this.send("stop");
  }
}
