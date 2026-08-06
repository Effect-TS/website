import mdx from "@astrojs/mdx"
import react from "@astrojs/react"
import vercel from "@astrojs/vercel"
import tailwindcss from "@tailwindcss/vite"
import expressiveCode from "astro-expressive-code"
import { defineConfig, envField, fontProviders, svgoOptimizer } from "astro/config"
import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import svgr from "vite-plugin-svgr"
import { monacoEditorPlugin } from "./src/features/playground/plugins/monaco-editor"
import { docsLegacyRedirectList } from "./src/generated/docs-legacy-redirects"
import { twieRedirectList } from "./src/generated/twie-redirects"

const GoogleFontProvider = fontProviders.google()

const ogAssetPngs = (readdirSync("src/pages/og/_assets", { recursive: true }) as string[])
  .filter((f) => f.endsWith(".png"))
  .map((f) => `./src/pages/og/_assets/${f}`)

// https://astro.build/config
export default defineConfig({
  site: "https://effect.website",

  adapter: vercel({
    includeFiles: [
      "./src/assets/fonts/Inter-Regular.ttf",
      "./src/assets/fonts/Inter-Bold.ttf",
      "./src/assets/fonts/JetBrainsMono-Regular.ttf",
      "./src/assets/fonts/JetBrainsMono-Bold.ttf",
      ...ogAssetPngs,
    ],
  }),

  trailingSlash: "never",

  compressHTML: true,

  build: {
    concurrency: 2,
  },

  experimental: {
    svgOptimizer: svgoOptimizer(),
  },

  vite: {
    plugins: [
      tailwindcss(),
      svgr(),
      monacoEditorPlugin({
        languages: ["typescript", "javascript", "json", "css", "html"],
        features: "all",
      }),
    ],
    resolve: {
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
      PUBLIC_POSTHOG_KEY: envField.string({ context: "client", access: "public", optional: true }),
      PUBLIC_POSTHOG_API_HOST: envField.string({
        context: "client",
        access: "public",
        optional: true,
        default: "https://us.i.posthog.com",
      }),
    },
  },

  integrations: [expressiveCode(), react(), mdx()],

  fonts: [
    {
      provider: GoogleFontProvider,
      name: "Inter",
      weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      cssVariable: "--font-inter",
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
    },
    {
      provider: GoogleFontProvider,
      name: "JetBrains Mono",
      weights: ["300", "400", "500", "600", "700"],
      display: "swap",
      cssVariable: "--font-jetbrains-mono",
      fallbacks: ["ui-monospace", "SFMono-Regular", "monospace"],
    },
  ],

  redirects: {
    ...twieRedirectList,
    ...docsLegacyRedirectList,
    "/adoption-partners": {
      status: 307,
      destination: "/adoption-partners/ziverge",
    },
    "/docs": {
      status: 307,
      destination: "/docs/v3/getting-started/introduction",
    },
    "/docs/v3": {
      status: 307,
      destination: "/docs/v3/getting-started/introduction",
    },
    "/docs/v4": {
      status: 307,
      destination: "/docs/v4/getting-started/introduction",
    },
    "/docs/api": {
      status: 307,
      destination: "/docs/v4/api",
    },
    "/docs/api/[version]": {
      status: 308,
      destination: "/docs/[version]/api",
    },
    "/docs/api/[version]/[package]": {
      status: 308,
      destination: "/docs/[version]/api/[package]",
    },
    "/docs/api/[version]/[package]/[...module]": {
      status: 308,
      destination: "/docs/[version]/api/[package]/[...module]",
    },
  },
})
