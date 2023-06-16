import { useRouter } from "next/router"
import { EffectLogo } from "./components/EffectLogo"
import { DocsThemeConfig } from "nextra-theme-docs"

const bold = ["Concepts", "Guides"]

const config: DocsThemeConfig = {
  docsRepositoryBase: "https://github.com/Effect-TS/website/blob/main",
  sidebar: {
    defaultMenuCollapseLevel: 2,
  },
  useNextSeoProps() {
    const { asPath } = useRouter()
    if (asPath !== "/") {
      return {
        titleTemplate: "%s – Effect",
      }
    }
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
    link: "https://github.com/Effect-TS",
  },
  chat: {
    link: "https://discord.gg/effect-ts",
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
    ),
  },
}

export default config
