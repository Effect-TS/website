"use client"

import { useMDXComponent } from "next-contentlayer/hooks"
import { H2, H3, H4 } from "@/components/atoms/headings"
import { Tab, Tabs } from "@/components/docs/components/tabs"
import * as Callouts from "@/components/docs/components/callouts"
import { Steps } from "@/components/docs/components/steps"
import { Pre } from "../docs/components/pre"
import { CodeOutput } from "../docs/components/code-output"
import * as ReactTweet from "react-tweet"
import * as ReactTwitchEmbed from "react-twitch-embed"
import { DiscordLink } from "../podcast/discord-link"
import { Transcript } from "../podcast/transcript"

const YouTube = ({ url }: { url: string }) => (
  <div className="video-container">
    <iframe
      className="video-responsive-iframe"
      src={url}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  </div>
)

const Tweet = ({ id }: { id: string }) => (
  <div className="tweet">
    <ReactTweet.Tweet id={id} />
  </div>
)

const TwitchClip = ({ clip }: { clip: string }) => (
  <div>
    <ReactTwitchEmbed.TwitchClip clip={clip} autoplay={false} />
  </div>
)

const TwitchPlayerNonInteractive = ({ video }: { video: string }) => (
  <div>
    <ReactTwitchEmbed.TwitchPlayerNonInteractive
      video={video}
      autoplay={false}
    />
  </div>
)

export const MDX: React.FC<{ content: string }> = ({ content }) => {
  const Content = useMDXComponent(content)

  return (
    <div className="relative prose max-w-lg prose-headings:font-display dark:prose-invert prose-headings:text-black dark:prose-headings:text-white prose-tr:border-zinc-200 dark:prose-tr:border-white/20 prose-thead:text-base prose-thead:font-sans prose-thead:border-zinc-200 dark:prose-thead:border-white/20 text-zinc-700 dark:text-zinc-300 prose-li:my-1 dark:prose-hr:border-zinc-800">
      <Content
        components={{
          h2: H2,
          h3: H3,
          h4: H4,
          pre: Pre,
          Tab,
          Tabs,
          Steps,
          ...Callouts,
          CodeOutput,
          Tweet,
          YouTube,
          TwitchClip,
          TwitchPlayerNonInteractive,
          DiscordLink,
          Transcript
        }}
      />
    </div>
  )
}
