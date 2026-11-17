"use client";
import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { Quiz } from "@/components/Quiz";
import { Feedback } from "@/components/ui";
import type { Lesson, LessonQuestion } from "@/content/lessons";
import { applyUci } from "@/lib/chess/rules";
import { useStore } from "@/lib/store/store";
import type { SkillId } from "@/lib/learning/skills";

/** A "play the move" question. Wrong moves are recorded and the learner can try again. */
function MoveQuestion({ q, itemId, context, difficulty, skill }: { q: Extract<LessonQuestion, { kind: "move" }>; itemId: string; context: string; difficulty: number; skill: SkillId }) {
  const record = useStore((s) => s.record);
  const side = q.fen.split(" ")[1] as "w" | "b";
  const [result, setResult] = useState<{ ok: boolean; san: string } | null>(null);
  const [rev, setRev] = useState(0);
  const [start, setStart] = useState(() => Date.now());

  function onMove(uci: string) {
    if (result?.ok) return;
    const c = new Chess(q.fen);
    const m = applyUci(c, uci);
    if (!m) return;
    const ok = q.answers.includes(m.san) || (!!q.mate && c.isCheckmate());
    setResult({ ok, san: m.san });
    setRev((r) => r + 1);
    record({ itemId, module: "quiz", skill, concept: `lesson:${itemId.split(":")[1]}`, difficulty, itemRd: 200, outcome: ok ? "solo" : "failed", hints: 0, ms: Date.now() - start, context, noCard: true });
    setStart(Date.now());
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,26rem)_1fr]">
      <Board fen={q.fen} orientation={side} movable={result?.ok ? null : side} onMove={onMove} resetKey={rev} label={q.prompt} />
      <div className="grid content-start gap-3">
        <p className="text-lg">{q.prompt}</p>
        {result && (
          <Feedback tone={result.ok ? "good" : "bad"}>
            <p className="font-semibold">{result.ok ? `${result.san} is right.` : `${result.san} is not it. Try again.`}</p>
            {result.ok && <p className="mt-1">{q.explain}</p>}
          </Feedback>
        )}
      </div>
    </div>
  );
}

export function LessonView({ lesson, context, difficulty, skill }: { lesson: Lesson; context: string; difficulty: number; skill: SkillId }) {
  const attempts = useStore((s) => s.attempts);
  const solved = useMemo(() => new Set(attempts.filter((a) => a.outcome === "solo" && a.itemId.startsWith(`lesson:${lesson.id}:`)).map((a) => a.itemId)), [attempts, lesson.id]);
  // Choice questions are one try each; a wrong answer can be retried by reopening the question.
  const [retry, setRetry] = useState<Record<number, number>>({});

  return (
    <article className="grid gap-8">
      <div className="prose-lesson grid gap-6">
        {lesson.blocks.map((b, i) =>
          b.kind === "text" ? (
            <p key={i} className="text-lg">
              {b.text}
            </p>
          ) : (
            <figure key={i} className="grid gap-2 md:grid-cols-[minmax(0,22rem)_1fr] md:items-center">
              <Board fen={b.fen} orientation={b.fen.split(" ")[1] as "w" | "b"} arrows={b.arrows?.map((a) => ({ ...a, color: "green" as const }))} textInput={false} label={b.caption} />
              <figcaption className="text-muted">{b.caption}</figcaption>
            </figure>
          ),
        )}
      </div>
      <section aria-labelledby="check" className="grid gap-8 border-t border-line pt-6">
        <h2 id="check" className="text-2xl">
          Check your understanding
        </h2>
        {lesson.questions.map((q, i) => {
          const itemId = `lesson:${lesson.id}:${i}`;
          return (
            <div key={i} className="grid gap-3">
              <p className="flex items-center gap-2 text-sm text-muted">
                Question {i + 1} of {lesson.questions.length}
                {solved.has(itemId) && <span className="chip border-good text-good">Answered correctly</span>}
              </p>
              {q.kind === "move" ? (
                <MoveQuestion q={q} itemId={itemId} context={context} difficulty={difficulty} skill={skill} />
              ) : (
                <div className="grid gap-4 md:grid-cols-[minmax(0,22rem)_1fr]">
                  {q.fen ? <Board fen={q.fen} orientation={q.fen.split(" ")[1] as "w" | "b"} textInput={false} label="Question position" /> : null}
                  <div className={q.fen ? "" : "md:col-span-2"}>
                    <Quiz key={retry[i] ?? 0} prompt={q.prompt} options={q.options} attempt={{ itemId, module: "quiz", skill, concept: `lesson:${lesson.id}`, difficulty, itemRd: 200, context, noCard: true }} />
                    {!solved.has(itemId) && (
                      <button className="btn btn-quiet mt-2" onClick={() => setRetry((r) => ({ ...r, [i]: (r[i] ?? 0) + 1 }))}>
                        Try this question again
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </article>
  );
}
