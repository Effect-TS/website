import * as React from "react"
import { cn, cssVars } from "@/lib/utils"
import { YOUTUBE_NOCOOKIE_URL } from "../constants"
import {
  useEmbedConnect,
  useEmbedControls,
  useEmbedDebug,
  useEmbedPreview,
  useEmbedVideo,
} from "../context"
import { YouTubeEmbedDebugger } from "./YouTubeEmbedDebugger"

export type YouTubePosterQuality =
  | "default"
  | "hqdefault"
  | "mqdefault"
  | "sddefault"
  | "maxresdefault"

/**
 * SEO metadata for a YouTube video that follows the schema.org `VideoObject`
 * structure.
 *
 * See: https://developers.google.com/search/docs/appearance/structured-data/video
 *
 * All fields are optional but providing them improves search engine
 * discoverability and enables rich results (video carousels, thumbnails in
 * search results).
 */
export interface YouTubeVideoSEO {
  /**
   * The title of the video. If not provided, falls back to the component's
   * `title` prop.
   */
  readonly name?: string | undefined
  /**
   * A description of the video content.
   *
   * Recommended: 50-160 characters for optimal search result display.
   */
  readonly description?: string | undefined
  /**
   * ISO 8601 date when the video was uploaded to YouTube.
   */
  readonly uploadDate?: string | undefined
  /**
   * ISO 8601 duration format. Required for video rich results.
   * Format: PT#H#M#S where # is the number of hours, minutes, seconds
   */
  readonly duration?: string | undefined
  /**
   * Custom thumbnail URL. If not provided, auto-generated from video ID.
   * Recommended: At least 1200px wide for best quality in search results.
   */
  readonly thumbnailUrl?: string | undefined
  /**
   * Direct URL to watch the video. Auto-generated if not provided.
   * @example "https://www.youtube.com/watch?v=L2vS_050c-M"
   */
  readonly contentUrl?: string | undefined
  /**
   * The embed URL. Auto-generated from video ID if not provided.
   */
  readonly embedUrl?: string | undefined
}

const YOUTUBE_PLAY_BUTTON_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 48"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="%23f00"/><path d="M45 24 27 14v20" fill="%23fff"/></svg>'

const FALLBACK_POSTER_BACKGROUND_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAADGCAYAAAAT+OqFAAAAdklEQVQoz42QQQ7AIAgEF/T/D+kbq/RWAlnQyyazA4aoAB4FsBSA/bFjuF1EOL7VbrIrBuusmrt4ZZORfb6ehbWdnRHEIiITaEUKa5EJqUakRSaEYBJSCY2dEstQY7AuxahwXFrvZmWl2rh4JZ07z9dLtesfNj5q0FU3A5ObbwAAAABJRU5ErkJggg=="

export function YouTubeEmbed({
  aspectHeight = 9,
  aspectWidth = 16,
  posterQuality = "hqdefault",
  seo,
  webp = true,
}: {
  readonly aspectHeight?: number | undefined
  readonly aspectWidth?: number | undefined
  readonly posterQuality?: YouTubePosterQuality | undefined
  readonly seo?: YouTubeVideoSEO | undefined
  readonly webp?: boolean | undefined
}) {
  const connect = useEmbedConnect()
  const { play } = useEmbedControls()
  const debug = useEmbedDebug()
  const [isPreviewing, setPreviewing] = useEmbedPreview()
  const video = useEmbedVideo()
  const [isPreconnected, setPreconnected] = React.useState(false)

  const posterUrl = React.useMemo(() => {
    const id = globalThis.encodeURIComponent(video.id)
    const format = webp ? "webp" : "jpg"
    const vi = webp ? "vi_webp" : "vi"
    return `https://i.ytimg.com/${vi}/${id}/${posterQuality}.${format}`
  }, [video.id, posterQuality, webp])

  const handleClick = React.useCallback(() => {
    if (!isPreviewing) return
    setPreviewing(false)
  }, [isPreviewing, play])

  const handlePreconnect = React.useCallback(() => {
    if (isPreconnected) return
    setPreconnected(true)
  }, [isPreconnected, setPreconnected])

  const targetRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      if (!isPreviewing && element !== null) {
        connect(element)
      }
    },
    [connect, isPreviewing],
  )

  return (
    <div className="relative isolate">
      {/* YouTube Poster Preload */}
      <link rel="preload" href={posterUrl} as="image" />

      {/* YouTube Preconnect */}
      {isPreconnected && (
        <React.Fragment>
          <link rel="preconnect" href={YOUTUBE_NOCOOKIE_URL} />
          <link rel="preconnect" href="https://www.google.com" />
        </React.Fragment>
      )}

      {/* SEO: Metadata for the YouTube video following the VideoObject schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: generateVideoStructuredData(
            video.id,
            video.title,
            posterUrl,
            YOUTUBE_NOCOOKIE_URL,
            seo,
          ),
        }}
      />

      {/* SEO: Include a noscript fallback for accessibility / web crawlers */}
      <noscript>
        <a
          href={`https://www.youtube.com/watch?v=${globalThis.encodeURIComponent(video.id)}`}
          aria-label={`Watch ${video.title} on YouTube`}
        >
          Watch &quot;{video.title}&quot; on YouTube
        </a>
      </noscript>

      <article
        style={cssVars({
          "--aspect-ratio": `${(aspectHeight / aspectWidth) * 100}%`,
          "--container-url": `url('${FALLBACK_POSTER_BACKGROUND_IMAGE}')`,
          backgroundImage: `url('${posterUrl}')`,
        })}
        className={cn(
          "group relative aspect-video overflow-hidden rounded-lg bg-cover bg-position-[50%] contain-layout contain-size",
          "after:block after:pb-(--aspect-ratio) after:content-['']",
          isPreviewing &&
            "before:pointer-events-none before:absolute before:top-0 before:box-content before:block before:h-[60px] before:w-full before:bg-(image:--container-url) before:bg-top before:bg-repeat-x before:pb-[50px] before:opacity-0 before:transition-all before:duration-200 before:content-['']",
        )}
        data-title={video.title}
      >
        {isPreviewing && (
          <button
            type="button"
            onClick={handleClick}
            onPointerOver={handlePreconnect}
            onFocus={handlePreconnect}
            aria-label={`Watch ${video.title}`}
            style={cssVars({
              "--button-url": `url('${YOUTUBE_PLAY_BUTTON_SVG}')`,
            })}
            className="absolute inset-0 z-1 cursor-pointer rounded-lg border border-zinc-700 bg-transparent p-0"
          >
            <span className="sr-only">Watch {video.title}</span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-1/2 left-1/2 h-12 w-17 -translate-1/2",
                "bg-transparent bg-(image:--button-url) bg-size-[100%_100%] bg-no-repeat",
                "opacity-80 grayscale transition-[filter,opacity] duration-100 ease-out",
                "group-hover:opacity-100 group-hover:filter-none",
              )}
            />
          </button>
        )}

        {!isPreviewing && (
          <div
            ref={targetRef}
            className={cn(
              "[&>iframe]:absolute [&>iframe]:top-0 [&>iframe]:right-0 [&>iframe]:left-0",
              "[&>iframe]:block [&>iframe]:h-full [&>iframe]:w-full",
              "[&>iframe]:border-0 [&>iframe]:bg-black [&>iframe]:p-0 [&>iframe]:outline-0",
            )}
          />
        )}
      </article>

      {debug && <YouTubeEmbedDebugger />}
    </div>
  )
}

/**
 * Generates JSON-LD structured data for the VideoObject schema.
 *
 * @see https://schema.org/VideoObject
 * @see https://developers.google.com/search/docs/appearance/structured-data/video
 */
function generateVideoStructuredData(
  videoId: string,
  title: string,
  posterUrl: string,
  youtubeUrl: string,
  seo?: YouTubeVideoSEO,
): string {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: seo?.name || title,
    thumbnailUrl: [seo?.thumbnailUrl || posterUrl],
    embedUrl: seo?.embedUrl || `${youtubeUrl}/embed/${videoId}`,
    contentUrl: seo?.contentUrl || `https://www.youtube.com/watch?v=${videoId}`,
    ...(seo?.description && { description: seo.description }),
    ...(seo?.uploadDate && { uploadDate: seo.uploadDate }),
    ...(seo?.duration && { duration: seo.duration }),
  }
  return JSON.stringify(structuredData)
}
