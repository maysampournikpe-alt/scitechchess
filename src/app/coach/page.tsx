"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, Ready } from "@/components/ui";
import { answer, matchTopic, TOPICS, type Answer, type Topic } from "@/lib/learning/coach";
import { dailyPlan } from "@/lib/learning/plan";
import { useStore } from "@/lib/store/store";
import { usePlanInput } from "@/lib/store/derived";

type Turn = { q: string; a: Answer };

function Coach() {
  const skills = useStore((s) => s.skills);
  const attempts = useStore((s) => s.attempts);
  const input = usePlanInput();
  const plan = useMemo(() => (input ? dailyPlan(input) : null), [input]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");

  function ask(q: string, topic: Topic | null) {
    const a: Answer = topic
      ? answer(topic, { skills, attempts, plan, now: Date.now() })
      : { text: ["I can answer the questions listed above, using your own training data. I do not have a language model, so I won't guess at anything else."], links: [] };
    setTurns((t) => [...t, { q, a }]);
  }

  return (
    <>
      <PageHeader title="My coach" lead="Answers come from your own results and from checked chess rules. There is no AI chatbot behind this page, so it never invents a variation." />
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button key={t.id} className="btn" onClick={() => ask(t.question, t.id)}>
            {t.question}
          </button>
        ))}
      </div>
      <form
        className="mt-4 flex max-w-2xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          ask(text.trim(), matchTopic(text));
          setText("");
        }}
      >
        <label htmlFor="ask" className="sr-only">
          Ask a question
        </label>
        <input id="ask" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Or type a question" maxLength={300} />
        <button className="btn btn-primary">Ask</button>
      </form>
      <ol className="mt-6 grid max-w-3xl gap-4" aria-live="polite">
        {turns.map((t, i) => (
          <li key={i} className="card p-4">
            <p className="font-semibold">{t.q}</p>
            <div className="mt-2 grid gap-1">
              {t.a.text.map((x) => (
                <p key={x}>{x}</p>
              ))}
            </div>
            {t.a.links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {t.a.links.map((l) => (
                  <Link key={l.href + l.label} href={l.href} className="btn">
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

export default function CoachPage() {
  return (
    <Ready>
      <Coach />
    </Ready>
  );
}
