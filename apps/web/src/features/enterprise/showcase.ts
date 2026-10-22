import type { ImageMetadata } from "astro"
import MasterclassLogo from "@/assets/company-logos/masterclass-noM.svg"
import OpencodeLogo from "@/assets/company-logos/opencode-wordmark-dark.svg"
import WarpLogo from "@/assets/company-logos/warp.svg"
import AlchemyMark from "@/assets/logos/alchemy/alchemy-mark-dark.svg"
import FoldkitMark from "@/assets/logos/foldkit/foldkit-mark-white.svg"
import OpenRouterLogo from "@/assets/logos/openrouter-v2-on-dark.svg"

/** Companies with a talk or episode about running Effect in production. */
export const PRODUCTION_STORIES: ReadonlyArray<{
  readonly company: string
  readonly logo: ImageMetadata
  /** Tailwind height class that makes the wordmark look even next to the others. */
  readonly logoHeight: string
  readonly useCase: string
  readonly href: string
}> = [
  {
    company: "OpenCode",
    logo: OpencodeLogo,
    logoHeight: "max-h-6",
    useCase: "Migrating a large TypeScript codebase to Effect",
    href: "https://www.youtube.com/watch?v=-mL7VVvkLGM",
  },
  {
    company: "OpenRouter",
    logo: OpenRouterLogo,
    logoHeight: "h-6",
    useCase: "Internal tooling and infrastructure",
    href: "https://youtu.be/AVJIqQi11lM",
  },
  {
    company: "Warp",
    logo: WarpLogo,
    logoHeight: "max-h-6",
    useCase: "Reliable payment and payroll systems",
    href: "/podcast/episodes/reliable-payroll-systems-in-typescript-with-effect-with-adam-rankin",
  },
  {
    company: "MasterClass",
    logo: MasterclassLogo,
    logoHeight: "max-h-5",
    useCase: "Real-time voice AI orchestration",
    href: "https://www.youtube.com/watch?v=x2bUuOZ-htU&list=PLDf3uQLaK2B_jaZ5Fy7IPNq0FIViV_CQl&index=6",
  },
]

/** Projects with their own communities, built on Effect. */
export const ECOSYSTEM_PROJECTS: ReadonlyArray<{
  readonly name: string
  readonly kind: string
  readonly mark: ImageMetadata
  readonly links: ReadonlyArray<{
    readonly label: string
    readonly href: string
  }>
}> = [
  {
    name: "Alchemy",
    kind: "Infrastructure as Code",
    mark: AlchemyMark,
    links: [
      { label: "Get started", href: "https://alchemy.run/getting-started" },
      { label: "Source", href: "https://github.com/alchemy-run/alchemy" },
    ],
  },
  {
    name: "Foldkit",
    kind: "Frontend framework",
    mark: FoldkitMark,
    links: [
      { label: "Get started", href: "https://foldkit.dev/get-started" },
      { label: "Source", href: "https://github.com/foldkit/foldkit" },
    ],
  },
]
