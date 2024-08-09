import { MDX } from "@/components/atoms/mdx"
import { ArrowRightIcon } from "@/components/icons/arrow-right"
import { Navigation } from "@/components/layout/navigation"
import { allPodcastEpisodes } from "contentlayer/generated"
import { format } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

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
  const episode = allPodcastEpisodes.find(
    (episode) => episode.urlPath === `/podcast/${slug}`
  )
  if (!episode) notFound()

  return (
    <>
      <Navigation />
      <div className="blog-container relative w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 flex flex-col md:flex-row items-start pt-32 sm:pt-40 min-h-screen">
        <aside className="flex shrink-0 md:sticky md:top-40 mb-16 flex-col">
          <div className="order-2 md:order-1 shrink-0 bg-gradient-to-br from-zinc-200 dark:from-zinc-500 to-zinc-300 dark:to-zinc-800 p-px rounded-2xl overflow-hidden">
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
          <Link
            href="/podcast"
            className="order-1 md:order-2 text-black dark:text-white font-medium block mb-5 md:mb-0 md:mt-5"
          >
            <ArrowRightIcon className="h-3 inline mr-2 mb-0.5 rotate-180" />
            <span>All episodes</span>
          </Link>
        </aside>
        <main className="md:pl-12 lg:pl-24 pb-24 -mt-2 grow overflow-hidden">
          <div className="mt-1">
            {format(new Date(episode.date), "MMM do, yyyy")}
          </div>
          <h1 className="font-display text-3xl lg:text-4xl text-black dark:text-white mt-2 mb-8">
            <span>#{episode.id}: </span>
            <span>{episode.title}</span>
          </h1>
          <p>{episode.excerpt}</p>
          <audio controls preload="none" className="w-full mt-6">
            <source src={episode.mp3} type="audio/mp3" />
          </audio>
          <section className="mt-16 md:mt-32">
            <MDX content={episode.body.code} />
          </section>
        </main>
      </div>
    </>
  )
}
