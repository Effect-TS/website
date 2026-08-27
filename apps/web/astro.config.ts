import mdx from "@astrojs/mdx"
import react from "@astrojs/react"
import vercel from "@astrojs/vercel"
import tailwindcss from "@tailwindcss/vite"
import expressiveCode from "astro-expressive-code"
import icon from "astro-icon"
import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config"
import { fileURLToPath } from "node:url"
import svgr from "vite-plugin-svgr"
import { monacoEditorPlugin } from "./src/features/playground/plugins/monaco-editor"
import { docsLegacyRedirectList } from "./src/generated/docs-legacy-redirects"
import { twieRedirectList } from "./src/generated/twie-redirects"

const FontsourceProvider = fontProviders.fontsource()

// https://astro.build/config
const config = defineConfig({
  site: "https://effect.website",

  adapter: vercel(),

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
    envDir: fileURLToPath(new URL("../../", import.meta.url)),
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
    },
  },

  integrations: [expressiveCode(), react(), mdx(), icon()],

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
      weights: ["400", "700"],
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
      weights: ["400", "700"],
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
      destination: "/docs/v3/getting-started/introduction",
    },
    "/docs/v4/guides": {
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

export default config
