"use client";
import Link from "next/link";
import { useStore } from "@/lib/store/store";

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {lead && <p className="mt-2 max-w-[65ch] text-muted">{lead}</p>}
      </div>
      {children}
    </header>
  );
}

/** Renders children only after saved progress has been read, so pages never flash empty data. */
export function Ready({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  if (!hydrated)
    return (
      <div className="card p-6 text-muted" role="status">
        Loading your training data…
      </div>
    );
  return <>{children}</>;
}

/** Pages that need a profile send the learner to onboarding instead of showing nothing. */
export function NeedsProfile({ children }: { children: React.ReactNode }) {
  const profile = useStore((s) => s.profile);
  if (!profile)
    return (
      <div className="card max-w-xl p-6">
        <h2 className="text-xl">Set up your training first</h2>
        <p className="mt-2 text-muted">Answer a few questions so your plan fits your level, your goal and the time you have. It takes about two minutes and needs no account.</p>
        <Link href="/onboarding/" className="btn btn-primary mt-4">
          Start my chess journey
        </Link>
      </div>
    );
  return <>{children}</>;
}

export function Feedback({ tone, children }: { tone: "good" | "bad" | "info"; children: React.ReactNode }) {
  const color = tone === "good" ? "border-good" : tone === "bad" ? "border-bad" : "border-line";
  return (
    <div role="status" aria-live="polite" className={`rounded-xl border-l-4 ${color} bg-raised px-4 py-3`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="num mt-1 font-[family-name:var(--font-display)] text-3xl">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function Empty({ title, children, href, action }: { title: string; children: React.ReactNode; href?: string; action?: string }) {
  return (
    <div className="card p-6">
      <h2 className="text-xl">{title}</h2>
      <p className="mt-2 max-w-[60ch] text-muted">{children}</p>
      {href && action && (
        <Link href={href} className="btn btn-primary mt-4">
          {action}
        </Link>
      )}
    </div>
  );
}
