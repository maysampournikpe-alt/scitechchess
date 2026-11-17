"use client";
import { useState } from "react";

export type Verified = { youtubeId: string; topic: string; practiceHref: string; level: string; title: string; channel: string; verifiedAt: string };

let videos: Promise<Verified[]> | null = null;
/** Videos confirmed with YouTube at build time (public/data/videos.json). */
export function loadVideos(): Promise<Verified[]> {
  videos ??= fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/videos.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Verified[]>) : []))
    .catch(() => {
      videos = null;
      return [];
    });
  return videos;
}


/** A click-to-load player: nothing is requested from YouTube until the learner presses play. */
export function Player({ v }: { v: Verified }) {
  const [on, setOn] = useState(false);
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-raised">
      {on ? (
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}?autoplay=1`}
          title={`${v.title} (${v.channel})`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button className="grid h-full w-full place-items-center text-center" onClick={() => setOn(true)} aria-label={`Play video: ${v.title}`}>
          <span className="btn btn-primary">Play video</span>
        </button>
      )}
    </div>
  );
}

