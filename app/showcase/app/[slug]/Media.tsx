"use client";

import { useState } from "react";
import { ArrowUpRight, Lock } from "lucide-react";

import type { ShowcaseApp } from "../../../lib/showcase";
import { Shot, hostOf, resolveScreenshotUrl } from "../../kit";

/* youtu.be/<id> and youtube.com/watch?v=<id> are what the submit form's plain
   URL field actually receives. Only these get an inline player; anything else
   (Vimeo, Loom) still gets a working link, and a direct video file plays in a
   <video> element. */
function youtubeEmbedUrl(videoUrl: string): string | null {
  try {
    const url = new URL(videoUrl);
    if (url.hostname === "youtu.be") return `https://www.youtube.com/embed${url.pathname}`;
    if (url.hostname.endsWith("youtube.com") && url.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${url.searchParams.get("v")}`;
    }
  } catch {
    return null;
  }
  return null;
}

const isVideoFile = (u: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u);

/**
 * The big preview: a browser frame around the one screenshot. When there is a
 * demo video it becomes a second item, with a two-thumb strip to switch; with
 * no video there is no strip at all.
 */
export function Media({ app }: { app: ShowcaseApp }) {
  const [showVideo, setShowVideo] = useState(false);
  const video = app.videoUrl;
  const count = video ? 2 : 1;
  const host = hostOf(app.appUrl);

  function renderVideo(url: string) {
    const embed = youtubeEmbedUrl(url);
    if (embed) {
      return (
        <iframe
          src={`${embed}?autoplay=1`}
          title={`${app.name} demo video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    if (isVideoFile(url)) {
      return <video src={url} controls playsInline autoPlay aria-label={`${app.name} demo video`} />;
    }
    return (
      <a className="sc-vlink" href={url} target="_blank" rel="noreferrer nofollow ugc">
        Watch the demo video ↗
      </a>
    );
  }

  return (
    <div className="sc-media">
      <div className="sc-stage">
        <div className="sc-shot">
          <div className="sc-chrome">
            <span className="tl" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {/* Creator-submitted URLs are user-generated content: `nofollow
                ugc` keeps a listing from passing link equity. */}
            <a
              className="url"
              href={app.appUrl}
              target="_blank"
              rel="noreferrer nofollow ugc"
              aria-label={`Open ${app.name} in a new tab`}
            >
              <Lock aria-hidden="true" />
              <span>{host}</span>
              <ArrowUpRight aria-hidden="true" />
            </a>
            <span className="ix">{count > 1 ? `${showVideo ? 2 : 1} / ${count}` : ""}</span>
          </div>
          <div className="sc-view">
            {showVideo && video ? (
              renderVideo(video)
            ) : (
              <Shot app={app} alt={`${app.name}: ${app.tagline}`} eager />
            )}
          </div>
        </div>
      </div>

      {video && (
        <div className="sc-thumbs" role="group" aria-label="Screenshot and demo">
          <button
            type="button"
            aria-pressed={!showVideo}
            aria-label="Show screenshot"
            onClick={() => setShowVideo(false)}
          >
            <Shot app={app} />
          </button>
          <button
            type="button"
            className="v"
            aria-pressed={showVideo}
            aria-label="Play demo video"
            onClick={() => setShowVideo(true)}
          >
            {app.screenshotUrl && <img src={resolveScreenshotUrl(app.screenshotUrl)} alt="" loading="lazy" />}
            <span>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 4.5v15l13-7.5z" />
              </svg>
            </span>
            <em>Demo</em>
          </button>
        </div>
      )}
    </div>
  );
}
