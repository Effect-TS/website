import { useCallback, useEffect, useRef, useState } from "react"

interface TweetEmbedProps {
  tweetId: string
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="1em"
      height="1em"
      viewBox="0 0 640 640"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M453.2 112h70.6L369.6 288.2L551 528H409L297.7 382.6L170.5 528H99.8l164.9-188.5L90.8 112h145.6l100.5 132.9zm-24.8 373.8h39.1L215.1 152h-42z" />
    </svg>
  )
}

declare global {
  interface Window {
    twttr?: {
      widgets: {
        createTweet: (
          id: string,
          el: HTMLElement,
          options?: Record<string, unknown>,
        ) => Promise<HTMLElement | undefined>
      }
      events: {
        bind: (event: string, callback: () => void) => void
      }
    }
  }
}

function renderTweet(
  tweetId: string,
  container: HTMLElement,
): Promise<HTMLElement | undefined> | undefined {
  return window.twttr?.widgets.createTweet(tweetId, container, {
    theme: document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
    dnt: true,
    align: "center",
  })
}

export function TweetEmbed({ tweetId }: TweetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const embedTweet = useCallback(async () => {
    const container = containerRef.current
    if (!container) return

    // Wait for twttr to be available
    if (!window.twttr) {
      // Load script if needed
      if (!document.querySelector('script[src*="platform.twitter.com"]')) {
        const script = document.createElement("script")
        script.src = "https://platform.twitter.com/widgets.js"
        script.async = true
        document.head.appendChild(script)
      }

      // Poll for twttr to become available
      await new Promise<void>((resolve, reject) => {
        let attempts = 0
        const interval = setInterval(() => {
          if (window.twttr) {
            clearInterval(interval)
            resolve()
          } else if (attempts > 50) {
            clearInterval(interval)
            reject(new Error("Twitter widgets failed to load"))
          }
          attempts++
        }, 200)
      })
    }

    // Clear container before rendering
    container.innerHTML = ""

    const el = await renderTweet(tweetId, container)

    if (el) {
      setLoaded(true)
      setError(false)
    } else {
      setError(true)
    }
  }, [tweetId])

  useEffect(() => {
    let cancelled = false

    embedTweet().catch(() => {
      if (!cancelled) setError(true)
    })

    return () => {
      cancelled = true
    }
  }, [embedTweet])

  // Re-render the tweet when the theme changes so it matches dark/light mode.
  useEffect(() => {
    if (!loaded) return

    const observer = new MutationObserver(() => {
      embedTweet().catch(() => {
        // ignore — the tweet was loaded before
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [loaded, embedTweet])

  return (
    <div className="not-prose my-8">
      {!loaded && !error && (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <XIcon className="text-base" />
            Loading tweet...
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className={
          loaded ? "flex justify-center" : "flex hidden justify-center"
        }
      />
      {error && (
        <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
          <a
            href={`https://x.com/i/status/${tweetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <XIcon className="text-base" />
            View on X
          </a>
        </div>
      )}
    </div>
  )
}
