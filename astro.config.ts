import mdx from "@astrojs/mdx"
import react from "@astrojs/react"
import vercel from "@astrojs/vercel"
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections"
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers"
import tailwindcss from "@tailwindcss/vite"
import expressiveCode from "astro-expressive-code"
import { defineConfig, envField, fontProviders, svgoOptimizer } from "astro/config"
import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import svgr from "vite-plugin-svgr"
import { monacoEditorPlugin } from "./src/features/playground/plugins/monaco-editor"
import { docsLegacyRedirectList } from "./src/generated/docs-legacy-redirects"
import { twieRedirectList } from "./src/generated/twie-redirects"
import { pluginOpenInPlayground } from "./src/plugins/expressive-code/open-in-playground.ts"

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
      ...ogAssetPngs,
    ],
  }),

  trailingSlash: "never",

  compressHTML: true,

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

  integrations: [
    expressiveCode({
      plugins: [pluginCollapsibleSections(), pluginLineNumbers(), pluginOpenInPlayground()],
      themes: ["github-light", "github-dark"],
    }),
    react(),
    mdx(),
  ],

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
    "/docs": {
      status: 307,
      destination: "/docs/v3/getting-started/introduction",
    },
    "/docs/v3": {
      status: 307,
      destination: "/docs/v3/getting-started/introduction",
    },
  },
})
