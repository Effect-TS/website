import _14AiLogo from "@/assets/logos/14ai/14ai.svg?react"
import ApplePodcastsLogo from "@/assets/logos/apple-podcasts/ApplePodcasts.webp"
import FoldkitLogo from "@/assets/logos/foldkit/foldkit.png"
import MasterclassLogo from "@/assets/logos/masterclass/Masterclass.svg?react"
import OpenCodeLogo from "@/assets/logos/opencode/opencode.svg?react"
import OpenRouterLogo from "@/assets/logos/openrouter.png"
import SpikoLogo from "@/assets/logos/spiko/Spiko.svg?react"
import SpotifyLogo from "@/assets/logos/spotify/Spotify.svg?react"
import VercelLogo from "@/assets/logos/vercel/Vercel.svg?react"
import WarpLogo from "@/assets/logos/warp/Warp.svg?react"
import YouTubeLogo from "@/assets/logos/youtube/YouTube.svg?react"
import ZendeskLogo from "@/assets/logos/zendesk/Zendesk.svg?react"
import { usePodcastEpisode } from "../context"

export function PodcastGuestCard() {
  const episode = usePodcastEpisode()

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 lg:shrink-0">
      <p className="mb-2 text-xs font-medium tracking-wider text-zinc-400 uppercase">
        Featured Guest
      </p>

      <p className="text-lg font-semibold text-white">{episode.guest}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
        <CompanyLogo company={episode.company} />
        <span>·</span>
        <span>{episode.formattedPublicationDate}</span>
        <span>·</span>
        <span>{episode.formattedDuration}</span>
      </div>

      <hr className="my-4 h-px border-0 bg-zinc-800" />

      <div>
        <p className="mb-3 text-xs font-medium tracking-wider text-zinc-400 uppercase">Listen on</p>

        <div className="flex items-center justify-between">
          <a
            className="group flex items-center text-white no-underline transition-colors"
            href={episode.links.apple}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Listen to the Cause & Effect Podcast on Apple Podcasts"
          >
            <img
              className="mr-1.5 h-5 w-auto"
              src={ApplePodcastsLogo.src}
              alt="Listen to the Cause & Effect Podcast on Apple Podcasts"
              loading="lazy"
            />
            <span className="text-sm group-hover:underline group-hover:underline-offset-2">
              Apple Podcasts
            </span>
          </a>
          <a
            className="group flex items-center text-white no-underline transition-colors"
            href={episode.links.spotify}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Listen to the Cause & Effect Podcast on Spotify"
          >
            <SpotifyLogo className="mr-1 size-6 fill-green-500" />
            <span className="text-sm group-hover:underline group-hover:underline-offset-2">
              Spotify
            </span>
          </a>
          <a
            className="group flex items-center text-white no-underline transition-colors"
            href={episode.links.youtube}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Subscribe to Effect on YouTube"
          >
            <YouTubeLogo className="mr-1 size-6 [&_.youtube-body]:fill-red-500 [&_.youtube-play]:fill-white" />
            <span className="text-sm group-hover:underline group-hover:underline-offset-2">
              YouTube
            </span>
          </a>
        </div>
      </div>
    </div>
  )
}

function CompanyLogo({ company }: { readonly company: string }) {
  switch (company) {
    case "14.ai":
      return <_14AiLogo className="h-4 w-auto" />
    case "masterclass":
      return <MasterclassLogo className="h-3 w-auto" />
    case "opencode":
      return <OpenCodeLogo className="h-4 w-auto" />
    case "openrouter":
      return <img src={OpenRouterLogo.src} alt="OpenRouter" className="h-4 w-auto" />
    case "spiko":
      return <SpikoLogo className="h-4 w-auto" />
    case "vercel":
      return <VercelLogo className="h-4 w-auto" />
    case "foldkit":
      return <img src={FoldkitLogo.src} alt="Foldkit" className="h-4 w-auto" />
    case "warp":
      return <WarpLogo className="h-4 w-auto" />
    case "zendesk":
      return <ZendeskLogo className="h-4 w-auto" />
    default:
      return null
  }
}
