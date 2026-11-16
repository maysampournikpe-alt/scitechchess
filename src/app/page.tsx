import Link from "next/link";
import { Logo } from "@/components/AppShell";
import { HeroBoard } from "@/components/HeroBoard";

const MODULES = [
  { title: "An assessment that looks at how you play", text: "Tactics, calculation, endgames, opening ideas and positional judgement are measured separately, each with its own score and uncertainty range." },
  { title: "A daily plan with reasons", text: "Tell us how many minutes you have. Each block says why it is there, using your own results." },
  { title: "Mistakes come back", text: "Every position you miss is scheduled for spaced review until you solve it unaided, days later." },
  { title: "Openings as ideas", text: "Nineteen opening lessons explain plans, pawn breaks and typical errors, then drill the moves on a real board." },
  { title: "Endgames you play out", text: "Lucena, Philidor, opposition and basic mates, practised against Stockfish as the defender." },
  { title: "A full engine in your browser", text: "Stockfish runs on your device for analysis and practice games. Nothing to install, nothing sent to a server." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <Link href="/train/" className="btn btn-quiet">
          Open my training
        </Link>
      </header>

      <main>
        <section className="grid items-center gap-10 py-8 md:grid-cols-[1.1fr_minmax(0,26rem)] md:py-16">
          <div className="rise">
            <h1 className="text-4xl sm:text-6xl">Your personal chess coach. Completely free.</h1>
            <p className="mt-5 max-w-[58ch] text-lg text-muted">
              Discover your strengths. Fix your weaknesses. Build your opening repertoire. Master the middlegame and endgame. Get a personalized training plan designed around how you actually play.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/onboarding/" className="btn btn-primary px-6 text-lg">
                Start my chess journey
              </Link>
              <p className="text-sm text-muted">No account, no payment, no ads. Your progress is saved on this device.</p>
            </div>
          </div>
          <HeroBoard />
        </section>

        <section aria-labelledby="what" className="border-t border-line py-12">
          <h2 id="what" className="text-3xl">
            What you get
          </h2>
          <ul className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <li key={m.title}>
                <h3 className="text-xl">{m.title}</h3>
                <p className="mt-2 text-muted">{m.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="honest" className="border-t border-line py-12">
          <h2 id="honest" className="text-3xl">
            What this is not
          </h2>
          <div className="mt-4 grid gap-6 text-muted md:grid-cols-3">
            <p>It is not a place to play other people. There is no matchmaking and no chat. You play the computer, because that is useful for training.</p>
            <p>It does not give you an official rating. Scores here measure your results on this site&apos;s exercises and are never presented as FIDE, US Chess, Chess.com or Lichess ratings.</p>
            <p>It has no paid tier. The engine and the lessons run in your browser, which is what keeps it free to run.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-sm text-muted">
        <p>
          Free software under the GNU GPL v3 or later. Puzzles and opening names from the Lichess open database (CC0). Engine: Stockfish (GPL v3). Board: Chessground (GPL v3).{" "}
          <Link href="/settings/#licenses" className="underline">
            Licences and source
          </Link>
        </p>
      </footer>
    </div>
  );
}
