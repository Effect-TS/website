import mdx from "@astrojs/mdx"
import react from "@astrojs/react"
// import vercel from "@astrojs/vercel"
import tailwindcss from "@tailwindcss/vite"
import expressiveCode from "astro-expressive-code"
import { rehypeHeadingIds, unified } from "@astrojs/markdown-remark"
import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config"
import { fileURLToPath } from "node:url"
import svgr from "vite-plugin-svgr"
import { openGraphMetadataPlugin } from "./src/features/open-graph/plugin"
import { monacoEditorPlugin } from "./src/features/playground/plugins/monaco-editor"
import { docsLegacyRedirectList } from "./src/generated/docs-legacy-redirects"
import { twieRedirectList } from "./src/generated/twie-redirects"
import { rehypeHeadingLinks } from "./src/features/docs/rehype-heading-links"

const FontsourceProvider = fontProviders.fontsource()

// Astro's content layer writes `data-store.json` here during a build, and
// `openGraphMetadataPlugin` reads it back. Kept out of `node_modules` so CI can
// restore/save it without caching the whole dependency tree; shared with the
// plugin so the two cannot drift.
const cacheDir = new URL("./.astro-cache/", import.meta.url)

// https://astro.build/config
const config = defineConfig({
  site: "https://effect.website",

  // adapter: vercel(),

  trailingSlash: "never",

  compressHTML: true,

  markdown: {
    processor: unified({
      rehypePlugins: [rehypeHeadingIds, rehypeHeadingLinks],
    }),
  },

  build: {
    // Astro disables the incremental build cache entirely when concurrency > 1.
    concurrency: 1,
  },

  cacheDir: fileURLToPath(cacheDir),

  experimental: {
    incrementalBuild: true,
    svgOptimizer: svgoOptimizer(),
  },

  vite: {
    optimizeDeps: {
      entries: ["src/features/playground/index.tsx"],
    },
    plugins: [
      tailwindcss(),
      svgr(),
      openGraphMetadataPlugin({ cacheDir }),
      monacoEditorPlugin({
        languages: ["typescript", "javascript", "json", "css", "html"],
        features: "all",
      }),
    ],
    envDir: fileURLToPath(new URL("../../", import.meta.url)),
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@/": fileURLToPath(new URL("./src/", import.meta.url)),
        "@astrojs/starlight/components": fileURLToPath(
          new URL("./src/components/docs/starlight-shim.ts", import.meta.url),
        ),
      },
    },
    server: {
      proxy: {
        "/api/dprint/plugins": {
          target: "https://plugins.dprint.dev",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/dprint\/plugins/, ""),
        },
      },
      watch: {
        ignored: ["**/.astro/**", "**/.direnv/**", "**/.vercel/**"],
      },
    },
  },

  env: {
    schema: {
      PUBLIC_POSTHOG_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_POSTHOG_API_HOST: envField.string({
        context: "client",
        access: "public",
        optional: true,
        default: "https://us.i.posthog.com",
      }),
      PUBLIC_WEBSITE_REVISION: envField.string({
        context: "client",
        access: "public",
        optional: true,
        default: "local",
      }),
    },
  },

  integrations: [expressiveCode(), react(), mdx()],

  fonts: [
    {
      provider: FontsourceProvider,
      name: "Inter",
      weights: ["100 900"],
      styles: ["normal", "italic"],
      cssVariable: "--font-inter",
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
    },
    {
      provider: FontsourceProvider,
      name: "Inter",
      weights: ["400", "600", "700"],
      styles: ["normal"],
      formats: ["woff"],
      cssVariable: "--font-og-inter",
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
    },
    {
      provider: FontsourceProvider,
      name: "JetBrains Mono",
      weights: ["300 700"],
      styles: ["normal", "italic"],
      display: "swap",
      cssVariable: "--font-jetbrains-mono",
      fallbacks: ["ui-monospace", "SFMono-Regular", "monospace"],
    },
    {
      provider: FontsourceProvider,
      name: "JetBrains Mono",
      weights: ["400", "500", "700"],
      styles: ["normal"],
      formats: ["woff"],
      display: "swap",
      cssVariable: "--font-og-jetbrains-mono",
      fallbacks: ["ui-monospace", "SFMono-Regular", "monospace"],
    },
  ],

  redirects: {
    ...twieRedirectList,
    ...docsLegacyRedirectList,
    "/events/effect-days": {
      status: 308,
      destination: "/effect-days",
    },
    "/events/effect-days/about-livorno": {
      status: 308,
      destination: "/effect-days/about-livorno",
    },
    "/events/effect-days/refund-policy": {
      status: 308,
      destination: "/effect-days/refund-policy",
    },
    "/adoption-partners": {
      status: 307,
      destination: "/adoption-partners/ziverge",
    },
    "/docs": {
      status: 307,
      destination: "/docs/v4/onboarding",
    },
    "/docs/v3": {
      status: 307,
      destination: "/docs/v3/onboarding",
    },
    "/docs/v4": {
      status: 307,
      destination: "/docs/v4/onboarding",
    },
    "/docs/v3/guides": {
      status: 307,
      destination: "/docs/v3/getting-started",
    },
    "/docs/v4/guides": {
      status: 307,
      destination: "/docs/v4/getting-started",
    },
    "/docs/v3/getting-started/introduction": {
      status: 308,
      destination: "/docs/v3/getting-started",
    },
    "/docs/v4/getting-started/introduction": {
      status: 308,
      destination: "/docs/v4/getting-started",
    },
    "/docs/v3/getting-started/control-flow": {
      status: 308,
      destination: "/docs/v3/code-style/control-flow",
    },
    "/docs/v4/getting-started/control-flow": {
      status: 308,
      destination: "/docs/v4/code-style/control-flow",
    },
    "/docs/api": {
      status: 307,
      destination: "/docs/v4/api",
    },
    "/docs/api/v4": {
      status: 308,
      destination: "/docs/v4/api",
    },
  },
})

export default config
