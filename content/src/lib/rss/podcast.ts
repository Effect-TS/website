import { render } from "astro:content"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import mdxRenderer from "@astrojs/mdx/server.js"
import type { RSSOptions } from "@astrojs/rss"
import { Marked } from "marked"
import markedPlaintify from "marked-plaintify"
import { DOCTYPE_NODE, ELEMENT_NODE, TEXT_NODE, transform, walk, type Node } from "ultrahtml"
import sanitize from "ultrahtml/transformers/sanitize"
import { getPodcastEntries, type PodcastEntry } from "@/lib/podcast"

export async function getRSSOptions(site: URL | undefined): Promise<RSSOptions> {
  const entries = await getPodcastEntries()
  entries.splice(20)

  const container = await AstroContainer.create()
  container.addServerRenderer({ name: "mdx", renderer: mdxRenderer })

  // The RSS route will only be injected if there is a `site` defined
  // in the Astro configuration file.
  const feedSite = site!

  return {
    title: "Cause & Effect",
    description:
      "A podcast exploring how engineers are using Effect to build reliable, production-grade software in TypeScript",
    // The RSS route will only be injected if there is a site defined
    // in the Astro configuration
    site: `${feedSite}/podcast/`,
    xmlns: {
      content: "http://purl.org/rss/1.0/modules/content/",
      itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd"
    },
    customData: [
      "<language>en</language>",
      "<copyright>Copyright © Effectful Technologies Inc.</copyright>",
      "<pubDate>Wed, 27 Nov 2024 12:32:30 +0100</pubDate>",
      "<itunes:author>Effectful Technologies Inc.</itunes:author>",
      '<itunes:category text="Technology"/>',
      "<itunes:type>episodic</itunes:type>",
      '<itunes:image href="https://img.transistor.fm/_BE8RBuq4CrOzXpIpGbsJ25926zhpuV8kaUExYHteoU/rs:fill:3000:3000:1/q:60/aHR0cHM6Ly9pbWct/dXBsb2FkLXByb2R1/Y3Rpb24udHJhbnNp/c3Rvci5mbS85MGFj/MGUzYzg4ODZmMDI1/NGJlNjZmMWNhYmJj/Njg1MC5wbmc.jpg"/>',
      "<itunes:summary>Explore how software engineers use Effect to build reliable, production-ready software in TypeScript.</itunes:summary>",
      "<itunes:subtitle>Explore how software engineers use Effect to build reliable, production-ready software in TypeScript.</itunes:subtitle>",
      "<itunes:keywords>typescript, production-grade software, functional programming</itunes:keywords>",
      "<itunes:owner><itunes:name>Effectful Technologies Inc.</itunes:name><itunes:email>contact@effectful.co</itunes:email></itunes:owner>",
      "<itunes:complete>No</itunes:complete>",
      "<itunes:explicit>false</itunes:explicit>"
    ].join(""),
    items: await Promise.all(
      entries.map(async (entry) => {
        const slug = entry.id.replace("podcast/", "")
        const url = `${feedSite}/podcast/episodes/${slug}/`
        return {
          title: entry.data.title,
          link: url,
          pubDate: entry.data.podcast.publicationDate,
          categories: entry.data.podcast.tags,
          description: await getRSSDescription(entry),
          content: await getRSSContent(entry, feedSite, container),
          enclosure: {
            url: entry.data.podcast.enclosure.url,
            length: entry.data.podcast.enclosure.length,
            type: entry.data.podcast.enclosure.type
          },
          customData: [
            `<itunes:duration>${entry.data.podcast.duration}</itunes:duration>`,
            `<itunes:episode>${entry.data.podcast.episodeNumber}</itunes:episode>`,
            "<itunes:episodeType>episodic</itunes:episodeType>",
            "<itunes:explicit>false</itunes:explicit>",
            `<itunes:image>${entry.data.podcast.image}</itunes:image>`
          ].join("")
        }
      })
    )
  }
}

async function getRSSContent(entry: PodcastEntry, baseURL: URL, container: AstroContainer): Promise<string> {
  const { Content } = await render(entry)
  const html = await container.renderToString(Content)

  const content = await transform(html, [
    async (node) => {
      // Thanks @delucis - https://github.com/delucis/astro-blog-full-text-rss/blob/204be3d5b84357d9a8e6b73ee751766b76ad727e/src/pages/rss.xml.ts
      // Thanks @Princesseuh - https://github.com/Princesseuh/erika.florist/blob/90d0063b3524b27aae193aff768db12709be0d05/src/middleware.ts
      await walk(node, (node) => {
        // Remove doctype preamble.
        if (node.type === DOCTYPE_NODE) {
          removeHTMLNode(node)
        } else if (node.type === ELEMENT_NODE) {
          // Transform link with relative path to absolute URL.
          if (node.name === "a" && node.attributes["href"]?.startsWith("/")) {
            node.attributes["href"] = stripTrailingSlash(baseURL.href) + node.attributes["href"]
          }
          // Transform image with relative path to absolute URL.
          if (node.name === "img" && node.attributes["src"]?.startsWith("/")) {
            node.attributes["src"] = stripTrailingSlash(baseURL.href) + node.attributes["src"]
          }
          // Remove aside icons.
          if (node.name === "svg" && node.attributes["style"]?.includes("--sl-icon-size")) {
            removeHTMLNode(node)
          }
          // Remove Expressive Code copy button.
          if (node.attributes["data-code"]) {
            removeHTMLNode(node)
          }
        }
      })

      return node
    },
    sanitize({
      dropAttributes: {
        class: ["*"],
        "data-astro-source-file": ["*"],
        "data-astro-source-loc": ["*"]
      },
      dropElements: ["link", "script", "style"]
    })
  ])

  // Strips empty attributes with no name if any.
  return content.replaceAll(/\s=""\s/g, " ")
}

const markedText = new Marked({ gfm: true }, markedPlaintify())

export async function stripMarkdown(markdown: string) {
  return await markedText.parse(markdown)
}

function getRSSDescription(entry: PodcastEntry): Promise<string> | undefined {
  if (!entry.data.description) {
    return
  }
  return stripMarkdown(entry.data.description)
}

function stripTrailingSlash(path: string) {
  if (!path.endsWith("/")) {
    return path
  }
  return path.slice(0, -1)
}

function removeHTMLNode(node: Node) {
  node.type = TEXT_NODE
  node.value = ""
}
