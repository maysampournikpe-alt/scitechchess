"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store/store";
import { dueCards } from "@/lib/learning/srs";

const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  { group: "Train", items: [{ href: "/train/", label: "Today" }, { href: "/assessment/", label: "Assessment" }, { href: "/mistakes/", label: "My mistakes" }] },
  {
    group: "Practice",
    items: [
      { href: "/puzzles/", label: "Puzzles" },
      { href: "/calculation/", label: "Calculation" },
      { href: "/vision/", label: "Board vision" },
      { href: "/openings/", label: "Openings" },
      { href: "/middlegame/", label: "Middlegame" },
      { href: "/endgames/", label: "Endgames" },
      { href: "/blunder-check/", label: "Blunder check" },
      { href: "/conversion/", label: "Convert and defend" },
      { href: "/play/", label: "Play the computer" },
    ],
  },
  { group: "Review", items: [{ href: "/analysis/", label: "Analysis" }, { href: "/games/", label: "Model games" }, { href: "/tournament/", label: "Tournament prep" }, { href: "/progress/", label: "My progress" }, { href: "/coach/", label: "My coach" }, { href: "/videos/", label: "Video academy" }] },
  { group: "", items: [{ href: "/settings/", label: "Settings" }] },
];

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" rx="6" fill="var(--accent-strong)" />
        <path d="M8 20h10v-1.6c-1.5-.9-2.3-2.4-2.5-4.6 1.6-.4 2.6-1.7 2.6-3.3 0-1.9-1.6-3.5-3.6-3.5v-1.6h-1.5V7h-1.6v1.5H13c-.4 1.7-1.4 2.6-2.7 3.6-1 .8-1.5 1.5-1.5 2.4h3.6c-.3 1.6-1.8 2.700-4.4 3.900z" fill="#fff" />
      </svg>
      ChessMastery
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const hydrated = useStore((s) => s.hydrated);
  const cards = useStore((s) => s.cards);
  const theme = useStore((s) => s.settings.theme);
  const board = useStore((s) => s.settings.board);
  const [due, setDue] = useState(0);

  useEffect(() => {
    void useStore.persist.rehydrate();
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.board = board;
    try {
      localStorage.setItem("cm-theme", theme);
    } catch {}
  }, [theme, board, hydrated]);
  useEffect(() => setDue(dueCards(Object.values(cards), Date.now()).length), [cards]);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const bare = pathname === "/" || pathname.startsWith("/onboarding");
  if (bare) return <>{children}</>;

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-5 p-4">
      {NAV.map((g) => (
        <div key={g.group || "other"}>
          {g.group && <p className="mb-1 px-3 text-sm text-muted">{g.group}</p>}
          <ul>
            {g.items.map((it) => {
              const active = pathname.startsWith(it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center justify-between rounded-lg px-3 py-2 no-underline transition-colors hover:bg-raised ${active ? "bg-raised font-semibold text-text" : "text-muted hover:text-text"}`}
                  >
                    {it.label}
                    {it.href === "/mistakes/" && due > 0 && (
                      <span className="chip num border-brass text-brass" aria-label={`${due} due for review`}>
                        {due}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15.5rem_1fr]">
      <a href="#main" className="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-2 backdrop-blur lg:hidden">
        <Link href="/train/" className="no-underline" aria-label="ChessMastery, go to today's training">
          <Logo />
        </Link>
        <button className="btn btn-quiet" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Menu"}
        </button>
      </header>
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 bottom-0 top-[61px] z-20 overflow-y-auto bg-bg lg:hidden">
          {nav}
        </div>
      )}
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-line lg:block">
        <Link href="/train/" className="block px-7 pb-1 pt-6 no-underline" aria-label="ChessMastery, go to today's training">
          <Logo />
        </Link>
        {nav}
      </aside>
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        {children}
      </main>
    </div>
  );
}
