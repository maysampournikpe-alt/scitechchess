import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { CHANNELS, VIDEOS, VIDEO_TOPICS } from "@/content/videos";

export const metadata = { title: "Video academy" };

export default function VideosPage() {
  return (
    <>
      <PageHeader title="Video academy" lead="Videos support the exercises; they never count as practice on their own. After watching, go straight to the linked exercises." />
      {VIDEOS.length === 0 && (
        <div className="card mb-8 max-w-3xl p-5">
          <h2 className="text-xl">No curated videos yet</h2>
          <p className="mt-2 text-muted">
            Every video in this library has to be checked first: that it exists, that its owner allows embedding, and that it fits the lesson. That check could not be run when this version was built, so rather than list links that might be wrong, the topics below link to a YouTube search and to the matching exercises.
          </p>
        </div>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {VIDEO_TOPICS.map((t) => (
          <li key={t.label} className="card p-5">
            <h2 className="text-xl">{t.label}</h2>
            <details className="mt-2">
              <summary className="text-sm font-semibold">Search a channel on YouTube</summary>
              <ul className="mt-2 flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <li key={c}>
                    <a className="chip hover:border-accent" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${c} ${t.query}`)}`} target="_blank" rel="noopener noreferrer">
                      {c}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
            <Link href={t.practiceHref} className="btn btn-primary mt-4">
              Practise this
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
