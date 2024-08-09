import { Navigation } from "@/components/layout/navigation"
import { Metadata } from "next"
import { allPodcastEpisodes } from "contentlayer/generated"
import { format } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRightIcon } from "@/components/icons/arrow-up-right"
import { ArrowRightIcon } from "@/components/icons/arrow-right"

const content = {
  heading: "Effect Podcast",
  description:
    "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua."
}

export const metadata: Metadata = {
  title: content.heading,
  description: content.description
}

export default function Podcast() {
  const episodes = allPodcastEpisodes.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <>
      <Navigation />
      <main className="docs-container relative w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pb-24 pt-32 sm:pt-40 min-h-screen">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-black dark:text-white">
          {content.heading}
        </h1>
        <p className="mt-6 mb-16 md:mb-32 max-w-2xl">{content.description}</p>
        <div className="flex flex-col gap-16 md:gap-32">
          {episodes.map((episode) => (
            <div
              key={episode.id}
              className="flex flex-col md:flex-row items-start gap-8 lg:gap-x-16"
            >
              <div className="font-display text-6xl text-black dark:text-white w-[7.5rem] shrink-0 flex">
                <div className="relative">
                  <span># {episode.id}</span>
                  <div className="h-1/2 absolute bottom-0 -inset-x-16 bg-gradient-to-b from-white/40 dark:from-[#09090B]/30 -rotate-[20deg]" />
                </div>
              </div>
              <div className="shrink-0 bg-gradient-to-br from-zinc-200 dark:from-zinc-500 to-zinc-300 dark:to-zinc-800 p-px rounded-2xl overflow-hidden">
                <div className="bg-zinc-50 dark:bg-zinc-950 rounded-[15px] overflow-hidden p-1.5">
                  <div className="relative size-64 rounded-[9px] overflow-hidden border border-transparent dark:border-zinc-800">
                    <Image
                      src={episode.thumbnail}
                      alt={`Effect Podcast: #{episode.id} ${episode.title}`}
                      fill
                      className="object-cover object-center"
                    />
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm">
                  {format(new Date(episode.date), "MMM do, yyyy")}
                </div>
                <h2 className="font-display text-black dark:text-white text-3xl mb-4">
                  {episode.title}
                </h2>
                <p>{episode.excerpt}</p>
                <audio controls preload="none" className="w-full mt-6">
                  <source src={episode.mp3} type="audio/mp3" />
                </audio>
                <Link
                  href={episode.urlPath}
                  className="mt-5 text-black dark:text-white font-medium block"
                >
                  <span>Episode notes</span>
                  <ArrowRightIcon className="h-3 inline ml-2 mb-0.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
