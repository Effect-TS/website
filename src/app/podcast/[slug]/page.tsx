import { MDX } from "@/components/atoms/mdx"
import { ArrowRightIcon } from "@/components/icons/arrow-right"
import { DiscordIcon } from "@/components/icons/discord"
import { Navigation } from "@/components/layout/navigation"
import { allPodcastEpisodes } from "contentlayer/generated"
import { format } from "date-fns"
import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"

export async function generateMetadata({
  params: { slug }
}: {
  params: { slug: string[] }
}) {
  const episode = allPodcastEpisodes.find(
    (episode) => episode.urlPath === `/podcast/${slug}`
  )
  // @ts-ignore
  if (!episode) return
  return {
    title: `#${episode.id}: ${episode.title} – Effect Podcast`,
    description: episode.excerpt
  }
}

export default function Page({
  params: { slug }
}: {
  params: { slug: string }
}) {
  const episodeById = allPodcastEpisodes.find((episode) => episode.id == slug)
  if (episodeById) permanentRedirect(episodeById.urlPath)

  const episode = allPodcastEpisodes.find(
    (episode) => episode.urlPath === `/podcast/${slug}`
  )
  if (!episode) notFound()

  return (
    <>
      <Navigation />
      <div className="blog-container relative w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 flex flex-col lg:flex-row items-start pt-32 sm:pt-40 min-h-screen">
        <aside className="flex shrink-0 lg:sticky md:top-40 mb-16 flex-col lg:pr-8 w-full lg:w-1/2">
          <div className="aspect-video order-2 lg:order-1 shrink-0 bg-gradient-to-br from-zinc-200 dark:from-zinc-500 to-zinc-300 dark:to-zinc-800 p-px rounded-2xl overflow-hidden">
            <div className="h-full bg-zinc-50 dark:bg-zinc-950 rounded-[15px] overflow-hidden p-1.5">
              <div className="h-full relative rounded-[9px] overflow-hidden border border-transparent dark:border-zinc-800">
                <iframe
                  src={`https://www.youtube.com/embed/${episode.youtubeId}`}
                  title={episode.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
          <Link
            href="/podcast"
            className="order-1 lg:order-2 text-black dark:text-white font-medium block mb-5 lg:mb-0 lg:mt-5 hover:underline"
          >
            <ArrowRightIcon className="h-3 inline mr-2 mb-0.5 rotate-180" />
            <span>All episodes</span>
          </Link>
        </aside>
        <main className="lg:pl-8 pb-24 -mt-2 grow overflow-hidden max-w-3xl">
          <div className="mt-1">
            {format(new Date(episode.date), "MMM do, yyyy")}
          </div>
          <h1 className="font-display text-3xl lg:text-4xl text-black dark:text-white mt-2 mb-8">
            <span>#{episode.id}: </span>
            <span>{episode.title}</span>
          </h1>
          <p>{episode.excerpt}</p>
          <section className="mt-16">
            <MDX content={episode.body.code} />
            <Link
              href="https://discord.gg/effect-ts"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-2 hover:underline mt-16 text-black dark:text-white font-medium"
            >
              <DiscordIcon className="h-5" />
              <span>Discuss this episode on Discord</span>
            </Link>
          </section>
        </main>
      </div>
    </>
  )
}
