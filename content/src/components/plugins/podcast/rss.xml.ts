import rss from "@astrojs/rss"
import type { APIRoute, GetStaticPathsResult } from "astro"

export function getStaticPaths() {
  return [{
    params: {
      prefix: "podcast"
    }
  }] satisfies GetStaticPathsResult
}

export const GET: APIRoute = async ({ site }) => {
  return rss({
    title: "Cause & Effect",
    description: "A podcast exploring how engineers are using Effect to build reliable, production-grade software in TypeScript",
    site: `${site}/podcast/`,
    xmlns: {
      itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd",
    },
    customData: [
      "<language>en</language>",
      "<copyright>Copyright © Effectful Technologies Inc.</copyright>",
      "<pubDate>Wed, 27 Nov 2024 12:32:30 +0100</pubDate>",
      "<podcast:guid>d45c229b-74f9-55d3-b3e6-f55149125752</podcast:guid>",
      "<podcast:locked owner=\"contact@effectful.co\">no</podcast:locked>",
      "<itunes:author>Effectful Technologies Inc.</itunes:author>",
      "<itunes:category text=\"Technology\"/>",
      "<itunes:type>episodic<itunes:type/>",
      "<itunes:type>episodic<itunes:type/>",
      "<itunes:image href=\"https://img.transistor.fm/_BE8RBuq4CrOzXpIpGbsJ25926zhpuV8kaUExYHteoU/rs:fill:3000:3000:1/q:60/aHR0cHM6Ly9pbWct/dXBsb2FkLXByb2R1/Y3Rpb24udHJhbnNp/c3Rvci5mbS85MGFj/MGUzYzg4ODZmMDI1/NGJlNjZmMWNhYmJj/Njg1MC5wbmc.jpg\"/>",
      "<itunes:summary>Explore how software engineers use Effect to build reliable, production-ready software in TypeScript.</itunes:summary>",
      "<itunes:subtitle>Explore how software engineers use Effect to build reliable, production-ready software in TypeScript.</itunes:subtitle>",
      "<itunes:subtitle>Explore how software engineers use Effect to build reliable, production-ready software in TypeScript.</itunes:subtitle>",
      "<itunes:keywords>typescript, production-grade software, functional programming</itunes:keywords>",
      "<itunes:owner><itunes:name>Effectful Technologies Inc.</itunes:name><itunes:email>contact@effectful.co</itunes:email></itunes:owner>",
      "<itunes:complete>No</itunes:complete>",
      "<itunes:explicit>false</itunes:explicit>"
    ].join(""),
    items: []
  })
}
