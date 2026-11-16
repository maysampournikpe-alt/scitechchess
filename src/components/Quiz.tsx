"use client";
import { useState } from "react";
import { Feedback } from "./ui";
import { useStore, type NewAttempt } from "@/lib/store/store";

export type QuizOption = { text: string; correct: boolean; feedback: string; partial?: boolean };

type Props = {
  prompt: string;
  options: QuizOption[];
  attempt: Omit<NewAttempt, "outcome" | "hints" | "ms">;
  onAnswered?: (correct: boolean) => void;
};

/** One multiple-choice question. One try; the explanation is shown for whichever option was chosen. */
export function Quiz({ prompt, options, attempt, onAnswered }: Props) {
  const record = useStore((s) => s.record);
  const [picked, setPicked] = useState<number | null>(null);
  const [start] = useState(() => Date.now());

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const o = options[i];
    record({ ...attempt, outcome: o.correct ? "solo" : "failed", hints: 0, ms: Date.now() - start });
    onAnswered?.(o.correct);
  }

  return (
    <div className="grid gap-3">
      <p className="text-lg">{prompt}</p>
      <div className="grid gap-2" role="group" aria-label="Answers">
        {options.map((o, i) => (
          <button key={o.text} className="choice" disabled={picked !== null} aria-pressed={picked === i} data-state={picked === null ? undefined : o.correct ? "right" : picked === i ? "wrong" : undefined} onClick={() => choose(i)}>
            {o.text}
          </button>
        ))}
      </div>
      {picked !== null && (
        <Feedback tone={options[picked].correct ? "good" : options[picked].partial ? "info" : "bad"}>
          <p className="font-semibold">{options[picked].correct ? "Correct." : options[picked].partial ? "Playable, but not the main plan." : "Not quite."}</p>
          <p className="mt-1">{options[picked].feedback}</p>
          {!options[picked].correct && (
            <p className="mt-2">
              <span className="font-semibold">Best answer:</span> {options.find((o) => o.correct)!.text}. {options.find((o) => o.correct)!.feedback}
            </p>
          )}
        </Feedback>
      )}
    </div>
  );
}
