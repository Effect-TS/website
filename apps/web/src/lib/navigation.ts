import { DOCS_VERSIONS, defaultDocsVersion } from "@/lib/docs-versions"

export type NavigationSurface = "desktop" | "mobile"

export type NavigationGroup = "primary" | "secondary" | "social"

export const NAVIGATION_EVENTS = {
  SEARCH_OPEN: "effect-search:open",
  SEARCH_OPENED: "effect-search:opened",
  SEARCH_CLOSE: "effect-search:close",
  MOBILE_MENU_OPEN: "effect-mobile-menu:open",
}

interface NavigationLinkBase {
  readonly id: string
  readonly label: string
  readonly group: NavigationGroup
  readonly surfaces: ReadonlyArray<NavigationSurface>
  readonly icon?: "discord" | "github" | "twitter"
}

export type NavigationDocsSection = "onboarding" | "guides" | "api"

export interface NavigationMenuEntry {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly slug?: NavigationActiveSlug
  readonly docsSection?: NavigationDocsSection
  readonly href: `/${string}` | `https://${string}`
  readonly docsPath?: "" | "/guides" | "/api"
}

export interface InternalNavigationLink extends NavigationLinkBase {
  readonly kind: "internal"
  readonly href: `/${string}`
  readonly menu?: ReadonlyArray<NavigationMenuEntry>
  readonly activeSlugs?: ReadonlyArray<NavigationActiveSlug>
}

export interface ExternalNavigationLink extends NavigationLinkBase {
  readonly kind: "external"
  readonly href: `https://${string}`
  readonly target: "_blank"
  readonly rel: "noopener noreferrer"
}

export type NavigationLink = InternalNavigationLink | ExternalNavigationLink

export type NavigationActiveSlug =
  | "api"
  | "blog"
  | "podcast"
  | "motw"
  | "jobs"
  | "docs"
  | "playground"
  | "community"
  | "effect-days"
  | "myths"
  | "adoption-partners"
  | "merch"

const docsMenu: ReadonlyArray<NavigationMenuEntry> = [
  {
    id: "docs-onboarding",
    label: "Onboarding",
    description: "Core concepts, in order",
    slug: "docs",
    docsSection: "onboarding",
    href: `/docs/${defaultDocsVersion}`,
    docsPath: "",
  },
  {
    id: "docs-guides",
    label: "Guides",
    description: "Each topic in more detail",
    slug: "docs",
    docsSection: "guides",
    href: `/docs/${defaultDocsVersion}/guides`,
    docsPath: "/guides",
  },
  {
    id: "docs-api",
    label: "Reference",
    description: "Packages, modules and exports",
    slug: "api",
    docsSection: "api",
    href: `/docs/${defaultDocsVersion}/api`,
    docsPath: "/api",
  },
  {
    id: "motw",
    label: "Module of the Week",
    description: "One lesser-known module at a time",
    slug: "motw",
    href: "/module-of-the-week",
  },
  {
    id: "podcast",
    label: "Podcast",
    description: "Engineers using Effect in production",
    slug: "podcast",
    href: "/podcast",
  },
  {
    id: "workshops",
    label: "Workshops",
    description: "Recorded sessions on YouTube",
    href: "https://www.youtube.com/playlist?list=PLDf3uQLaK2B9vHzUNyvOSvoMv61LW7792",
  },
  {
    id: "myths",
    label: "Myths",
    description: "Common misconceptions",
    slug: "myths",
    href: "/myths",
  },
]

const communityMenu: ReadonlyArray<NavigationMenuEntry> = [
  {
    id: "community-hub",
    label: "Community Hub",
    description: "Meetups, talks and events",
    slug: "community",
    href: "/community-hub",
  },
  {
    id: "jobs",
    label: "Jobs",
    description: "Open roles using Effect",
    slug: "jobs",
    href: "/effect-jobs",
  },
  {
    id: "adoption-partners",
    label: "Adoption partners",
    description: "Get help adopting Effect",
    slug: "adoption-partners",
    href: "/adoption-partners",
  },
  {
    id: "merch",
    label: "Merch",
    description: "Effect-branded merchandise",
    slug: "merch",
    href: "/merch",
  },
]

const primaryLink = (
  link: Omit<InternalNavigationLink, "kind" | "group" | "surfaces">,
): InternalNavigationLink => ({
  ...link,
  kind: "internal",
  group: "primary",
  surfaces: ["desktop", "mobile"],
})

export const LANDING_NAVIGATION_LINKS: ReadonlyArray<NavigationLink> = [
  primaryLink({
    id: "docs",
    label: "Docs",
    href: `/docs/${defaultDocsVersion}`,
    menu: docsMenu,
    activeSlugs: ["docs", "api", "motw", "podcast", "myths"],
  }),
  primaryLink({ id: "playground", label: "Play", href: "/play" }),
  primaryLink({ id: "blog", label: "Blog", href: "/blog" }),
  primaryLink({
    id: "community",
    label: "Community",
    href: "/community-hub",
    menu: communityMenu,
    activeSlugs: ["community", "jobs", "adoption-partners", "merch"],
  }),
  primaryLink({
    id: "effect-days",
    label: "Effect Days",
    href: "/effect-days",
  }),
  {
    id: "github",
    kind: "external",
    label: "GitHub",
    href: "https://github.com/Effect-TS/effect",
    target: "_blank",
    rel: "noopener noreferrer",
    group: "social",
    surfaces: ["desktop", "mobile"],
    icon: "github",
  },
  {
    id: "discord",
    kind: "external",
    label: "Discord",
    href: "https://discord.gg/effect-ts",
    target: "_blank",
    rel: "noopener noreferrer",
    group: "social",
    surfaces: ["desktop", "mobile"],
    icon: "discord",
  },
  {
    id: "twitter",
    kind: "external",
    label: "X / Twitter",
    href: "https://twitter.com/EffectTS_",
    target: "_blank",
    rel: "noopener noreferrer",
    group: "social",
    surfaces: ["desktop", "mobile"],
    icon: "twitter",
  },
]

export const getNavigationLinks = (
  surface: NavigationSurface,
  group: NavigationGroup,
): ReadonlyArray<NavigationLink> => {
  return LANDING_NAVIGATION_LINKS.filter((link) => {
    return link.group === group && link.surfaces.includes(surface)
  })
}

export const applyVersionToLinks = (
  version: string,
  links: ReadonlyArray<NavigationLink>,
): ReadonlyArray<NavigationLink> => {
  return links.map((link): NavigationLink => {
    if (link.kind !== "internal") return link
    if (link.id === "docs")
      return { ...link, href: `/docs/${version}` as `/${string}` }
    return link
  })
}

export const isNavigationLinkActive = (
  link: NavigationLink,
  activeSlug: NavigationActiveSlug | undefined,
): boolean => {
  if (activeSlug === undefined) return false
  if (link.id === activeSlug) return true
  return (
    link.kind === "internal" &&
    (link.activeSlugs?.includes(activeSlug) ?? false)
  )
}

export const isNavigationEntryActive = (
  entry: NavigationMenuEntry,
  context: {
    readonly activeSlug: NavigationActiveSlug | undefined
    readonly docsSection: NavigationDocsSection | undefined
  },
): boolean => {
  if (entry.slug === undefined || entry.slug !== context.activeSlug)
    return false
  return (
    entry.docsSection === undefined || entry.docsSection === context.docsSection
  )
}

export interface ResolvedNavigationMenuEntry {
  readonly href: string
  readonly alternates: ReadonlyArray<{
    readonly label: string
    readonly href: string
  }>
}

export const resolveNavigationMenuEntry = (
  entry: NavigationMenuEntry,
  version: string = defaultDocsVersion,
): ResolvedNavigationMenuEntry => {
  const { docsPath } = entry
  if (docsPath === undefined) return { href: entry.href, alternates: [] }
  return {
    href: `/docs/${version}${docsPath}`,
    alternates: DOCS_VERSIONS.filter(({ value }) => value !== version).map(
      ({ value, label }) => ({
        label,
        href: `/docs/${value}${docsPath}`,
      }),
    ),
  }
}
