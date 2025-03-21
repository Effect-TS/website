import { defineConfig } from "astro/config"
import vercel from "@astrojs/vercel"
import { h } from "hastscript"
import rehypeMermaid, { type RehypeMermaidOptions } from "rehype-mermaid"
import rehypeAutolinkHeadings, {
  type Options as RehypeAutolinkHeadingsOptions
} from "rehype-autolink-headings"
import starlightBlog from "starlight-blog"
import starlightLinksValidator from "starlight-links-validator"
import { rehypeHeadingIds } from "@astrojs/markdown-remark"
import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import tailwind from "@astrojs/tailwind"
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections"
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers"
import ecTwoSlash from "expressive-code-twoslash"
import { pluginOpenInPlayground } from "./src/plugins/expressive-code/open-in-playground"
import { pluginTwoslashPagefind } from "./src/plugins/expressive-code/twoslash-pagefind"
import { effectPlaygroundPlugin } from "./src/plugins/starlight/playground/plugin"
import { effectPodcastPlugin } from "./src/plugins/starlight/podcast/plugin"
import { monacoEditorPlugin } from "./src/plugins/vite/monaco-editor"
// import node from "@astrojs/node"

const VERCEL_PREVIEW_DOMAIN =
  process.env.VERCEL_ENV !== "production" && process.env.VERCEL_BRANCH_URL

const domain = VERCEL_PREVIEW_DOMAIN || "effect.website"

const site = `https://${domain}`

const rehypeMermaidOptions: RehypeMermaidOptions = {
  strategy: "img-svg",
  dark: true
}

const rehypeAutolinkHeadingsOptions: RehypeAutolinkHeadingsOptions = {
  behavior: "after",
  group({ tagName }) {
    return h("div", {
      tabIndex: -1,
      class: `autolink-heading-container level-${tagName}`
    })
  },
  content() {
    return [
      h(
        "span",
        {
          ariaHidden: "true",
          class: "anchor-icon"
        },
        h(
          "svg",
          {
            width: 16,
            height: 16,
            viewBox: "0 0 24 24"
          },
          h("path", {
            fill: "currentcolor",
            d: "m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"
          })
        )
      )
    ]
  },
  properties(node) {
    if ("id" in node.properties) {
      return {
        class: "anchor-link",
        ariaLabelledBy: node.properties.id
      }
    }
    throw new Error(
      "[rehype-autolink-headings]: Cannot generate a link for a heading without an identifier"
    )
  }
}

export default defineConfig({
  site,
  output: "server",
  trailingSlash: "always",
  // uncomment this to enable local preview (`pnpm build` + `pnpm preview`)
  // adapter: node({
  //   mode: "standalone"
  // }),
  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  }),
  markdown: {
    rehypePlugins: [
      [rehypeMermaid, rehypeMermaidOptions],
      // the following two plugins are required for the autolink headings to work
      // the headings are styled in the headings.css file
      rehypeHeadingIds,
      [rehypeAutolinkHeadings, rehypeAutolinkHeadingsOptions]
    ]
  },
  vite: {
    plugins: [
      monacoEditorPlugin({
        languages: ["json", "typescript"],
        features: "all"
      })
    ]
  },
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
      nesting: true
    }),
    starlight({
      title: "Effect Documentation",
      lastUpdated: true,
      components: {
        Head: "./src/components/overrides/Head.astro",
        SocialIcons: "./src/components/overrides/SocialIcons.astro",
        ThemeSelect: "./src/components/overrides/ThemeSelect.astro"
      },
      customCss: [
        // tye styles for the navigation header
        "./src/styles/header.css",
        // the styles for the autolink headings
        "./src/styles/headings.css",
        // the styles for the main site logo
        "./src/styles/logo.css",
        // adds additional styles to right sidebar elements
        "./src/styles/sidebar.css",
        // fixes overflow-wrap when the columns contains code blocks
        "./src/styles/tables.css",
        // the base styles for tailwind
        "./src/styles/tailwind.css",
        // fixes styles for astro-tweet
        "./src/styles/tweet.css",
        // the styles required for twoslash
        "./src/styles/twoslash.css"
      ],
      editLink: {
        baseUrl: "https://github.com/Effect-TS/website/edit/main/content/"
      },
      expressiveCode: {
        plugins: [
          pluginCollapsibleSections(),
          pluginLineNumbers(),
          pluginOpenInPlayground(),
          ecTwoSlash(),
          pluginTwoslashPagefind()
        ],
        themes: ["github-light", "github-dark"]
      },
      favicon: "/favicon.png",
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: true
      },
      social: {
        discord: "https://discord.gg/effect-ts",
        github: "https://github.com/Effect-TS",
        "x.com": "https://x.com/EffectTS_",
        youtube: "https://youtube.com/@effect-ts"
      },
      plugins: [
        starlightBlog({
          recentPostCount: 5,
          authors: {
            davide_scognamiglio: {
              name: "Davide Scognamiglio",
              title: "Project Manager",
              picture: "/authors/davide_scognamiglio.png",
              url: "https://twitter.com/DadeSkoTV"
            },
            giulio_canti: {
              name: "Giulio Canti",
              title: "Founding Engineer",
              picture: "/authors/giulio_canti.png",
              url: "https://github.com/gcanti"
            },
            maxwell_brown: {
              name: "Maxwell Brown",
              title: "Founding Engineer",
              picture: "/authors/maxwell_brown.png",
              url: "https://github.com/IMax153"
            },
            mirela_prifti: {
              name: "Mirela Prifti",
              title: "Community Manager",
              picture: "/authors/mirela_prifti.png",
              url: "https://twitter.com/MirelaPriftix"
            },
            michael_arnaldi: {
              name: "Michael Arnaldi",
              title: "Chief Executive Officer",
              picture: "/authors/michael_arnaldi.png",
              url: "https://github.com/mikearnaldi"
            },
            tim_smart: {
              name: "Tim Smart",
              title: "Founding Engineer",
              picture: "/authors/tim_smart.png",
              url: "https://github.com/tim-smart"
            }
          }
        }),
        starlightLinksValidator({
          exclude: ["/events/effect-days*"]
        }),
        effectPlaygroundPlugin({
          pattern: "/play"
        }),
        effectPodcastPlugin()
      ],
      sidebar: [
        {
          label: "Getting Started",
          autogenerate: { directory: "docs/getting-started" },
          collapsed: false
        },
        {
          label: "Error Management",
          autogenerate: { directory: "docs/error-management" },
          collapsed: false
        },
        {
          label: "Requirements Management",
          autogenerate: { directory: "docs/requirements-management" },
          collapsed: false
        },
        {
          label: "Resource Management",
          autogenerate: { directory: "docs/resource-management" },
          collapsed: false
        },
        {
          label: "Observability",
          autogenerate: { directory: "docs/observability" },
          collapsed: false
        },
        { label: "Configuration", slug: "docs/configuration" },
        { label: "Runtime", slug: "docs/runtime" },
        {
          label: "Scheduling",
          autogenerate: { directory: "docs/scheduling" },
          collapsed: false
        },
        {
          label: "State Management",
          autogenerate: { directory: "docs/state-management" },
          collapsed: false
        },
        { label: "Batching", slug: "docs/batching" },
        {
          label: "Caching",
          autogenerate: { directory: "docs/caching" },
          collapsed: false
        },
        {
          label: "Concurrency",
          autogenerate: { directory: "docs/concurrency" },
          collapsed: false
        },
        {
          label: "Stream",
          autogenerate: { directory: "docs/stream" },
          collapsed: false
        },
        {
          label: "Sink",
          autogenerate: { directory: "docs/sink" },
          collapsed: false
        },
        {
          label: "Testing",
          autogenerate: { directory: "docs/testing" },
          collapsed: false
        },
        {
          label: "Code Style",
          autogenerate: { directory: "docs/code-style" },
          collapsed: false
        },
        {
          label: "Data Types",
          autogenerate: { directory: "docs/data-types" },
          collapsed: false
        },
        {
          label: "Traits",
          autogenerate: { directory: "docs/trait" },
          collapsed: false
        },
        {
          label: "Behaviours",
          autogenerate: { directory: "docs/behaviour" },
          collapsed: false
        },
        {
          label: "Schema",
          autogenerate: { directory: "docs/schema" },
          collapsed: false
        },
        {
          label: "Micro",
          badge: { text: "Unstable", variant: "caution" },
          autogenerate: { directory: "docs/micro" },
          collapsed: false
        },
        {
          label: "Platform",
          badge: { text: "Unstable", variant: "caution" },
          autogenerate: { directory: "docs/platform" },
          collapsed: false
        },
        {
          label: "Additional Resources",
          autogenerate: { directory: "docs/additional-resources" },
          collapsed: false
        },
        {
          label: "Troubleshooting",
          autogenerate: { directory: "docs/troubleshooting" },
          collapsed: false
        }
      ]
    })
  ]
})
