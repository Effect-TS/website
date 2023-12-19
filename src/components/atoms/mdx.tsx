"use client"

// import React, { FC } from "react"
import { FC } from "react"
import { useMDXComponent } from "next-contentlayer/hooks"
import { H2, H3, H4 } from "@/components/atoms/headings"
import { Tab, Tabs } from "@/components/docs/components/tabs"
import { TestWebContainer } from "@/components/atoms/test-web-container"
import * as Callouts from "@/components/docs/components/callouts"
import { Steps } from "@/components/docs/components/steps"
import { Pre } from "../docs/components/pre"
import { CodeOutput } from "../docs/components/code-output"
// import { Mermaid } from "@theguild/remark-mermaid/mermaid"

export const MDX: FC<{ content: string }> = ({ content }) => {
  const Content = useMDXComponent(content)

  return (
    <div className="relative prose prose-headings:font-display dark:prose-invert prose-headings:text-black dark:prose-headings:text-white prose-tr:border-zinc-200 dark:prose-tr:border-white/20 prose-thead:text-base prose-thead:font-sans prose-thead:border-zinc-200 dark:prose-thead:border-white/20 text-zinc-700 dark:text-zinc-400 prose-li:my-1">
      <Content
        components={{
          h2: H2,
          h3: H3,
          h4: H4,
          pre: Pre,
          Tab,
          Tabs,
          Steps,
          // Mermaid,
          ...Callouts,
          CodeOutput
        }}
      />
    </div>
  )
}
