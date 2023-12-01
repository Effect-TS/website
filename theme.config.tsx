import { useRouter } from "next/router"
import { EffectLogo } from "./components/EffectLogo"
import { DocsThemeConfig } from "nextra-theme-docs"

const config: DocsThemeConfig = {
  docsRepositoryBase: "https://github.com/Effect-TS/website/blob/main",
  sidebar: {
    defaultMenuCollapseLevel: 1
  },
  useNextSeoProps() {
    const { asPath } = useRouter()
    if (asPath !== "/") {
      return {
        titleTemplate: "%s – Effect"
      }
    }
  },
  banner: {
    key: "effect-days-2024",
    text: (
      <a
        href="/events/effect-days"
        className="text-lg font-bold"
        target="_blank"
      >
        <span className="hidden sm:inline">Get your ticket for </span>
        <strong>Effect Days 2024</strong> in Vienna
        <span className="hidden sm:inline">, Austria &#8594;</span>
      </a>
    )
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Effect" />
      <meta
        property="og:description"
        content="A fully-fledged functional effect system for TypeScript with a rich standard library"
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
    </>
  ),
  logo: (
    <div className="w-24">
      <EffectLogo />
    </div>
  ),
  project: {
    link: "https://github.com/Effect-TS"
  },
  chat: {
    link: "https://discord.gg/effect-ts"
  },
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{" "}
        <a href="https://www.effect.website" target="_blank">
          Effectful Technologies Inc
        </a>
        .
      </span>
    )
  },
  navbar: {
    extraContent: (
      <>
        <a
          className="nx-p-2 nx-text-current"
          href={"https://www.youtube.com/@effect-ts"}
          target={"_blank"}
        >
          <svg
            width={"24"}
            height={"24"}
            viewBox="0 0 576 512"
            fill={"currentColor"}
          >
            <title>YouTube</title>
            <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"></path>
          </svg>
        </a>
        <a
          className="nx-p-2 nx-text-current"
          href={"https://twitter.com/EffectTS_"}
          target={"_blank"}
        >
          <svg
            width={"24"}
            height={"24"}
            viewBox="0 0 24 24"
            fill={"currentColor"}
          >
            <title>Twitter</title>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
          </svg>
        </a>
      </>
    )
  }
}

export default config
