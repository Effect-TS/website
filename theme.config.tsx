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
    key: 'effect-days-2024',
    text: (
      <a href="/events/effect-days" className="text-lg font-bold" target="_blank">
        <span className="hidden sm:inline">Join the waitlist for </span><strong>Effect Days 2024</strong> in Vienna<span className="hidden sm:inline">, Austria &#8594;</span>
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
  }
}

export default config
