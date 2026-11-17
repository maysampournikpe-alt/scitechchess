"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";
import { CHANNELS, VIDEO_TOPICS } from "@/content/videos";
import { loadVideos, Player, type Verified } from "@/components/VideoPlayer";

export default function VideosPage() {
  const [videos, setVideos] = useState<Verified[] | null>(null);
  useEffect(() => {
    loadVideos().then(setVideos, () => setVideos([]));
  }, []);
  const topics = [...new Set((videos ?? []).map((v) => v.topic))];

  return (
    <>
      <PageHeader title="Video academy" lead="Videos support the exercises; watching never counts as practice. After a video, do the linked exercises: that is what moves your scores." />
      {videos === null && <p role="status">Loading…</p>}
      {videos && videos.length > 0 && (
        <div className="grid gap-10">
          {topics.map((t) => (
            <section key={t} aria-labelledby={`topic-${t.replace(/\W+/g, "-")}`}>
              <h2 id={`topic-${t.replace(/\W+/g, "-")}`} className="text-2xl">
                {t}
              </h2>
              <ul className="mt-3 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {videos
                  .filter((v) => v.topic === t)
                  .map((v) => (
                    <li key={v.youtubeId} className="card grid content-start gap-3 p-4">
                      <Player v={v} />
                      <div>
                        <p className="font-semibold">{v.title}</p>
                        <p className="text-sm text-muted">
                          {v.channel}. Level: {v.level}. Checked with YouTube on {v.verifiedAt}.
                        </p>
                      </div>
                      <Link href={v.practiceHref} className="btn btn-primary justify-self-start">
                        Now practise it
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
          <p className="text-sm text-muted">Videos belong to their creators and play through YouTube. They load only when you press play.</p>
        </div>
      )}
      {videos && videos.length === 0 && (
        <>
          <div className="card mb-8 max-w-3xl p-5">
            <h2 className="text-xl">No videos could be confirmed for this version</h2>
            <p className="mt-2 text-muted">Each video is checked with YouTube when the site is built, and only confirmed ones are shown. Until then, search a channel for a topic and use the linked exercises.</p>
          </div>
          <ul className="grid gap-4 md:grid-cols-2">
            {VIDEO_TOPICS.map((t) => (
              <li key={t.label} className="card p-5">
                <h2 className="text-xl">{t.label}</h2>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {CHANNELS.map((c) => (
                    <li key={c}>
                      <a className="chip hover:border-accent" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${c} ${t.query}`)}`} target="_blank" rel="noopener noreferrer">
                        {c}
                      </a>
                    </li>
                  ))}
                </ul>
                <Link href={t.practiceHref} className="btn btn-primary mt-4">
                  Practise this
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
