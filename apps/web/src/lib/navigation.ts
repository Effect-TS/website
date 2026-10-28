import type { DocsNavSection } from "@/lib/docs-sections"
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

type DocsPath = "" | "/guides" | "/api"

export interface NavigationMenuEntry {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly slug?: NavigationActiveSlug
  readonly docsSection?: DocsNavSection
  readonly href: `/${string}` | `https://${string}`
  readonly docsPath?: DocsPath
}

export interface InternalNavigationLink extends NavigationLinkBase {
  readonly kind: "internal"
  readonly href: `/${string}`
  readonly docsPath?: DocsPath
  readonly menu?: ReadonlyArray<NavigationMenuEntry>
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

export const LANDING_NAVIGATION_LINKS: ReadonlyArray<NavigationLink> = [
  {
    id: "docs",
    kind: "internal",
    label: "Docs",
    href: `/docs/${defaultDocsVersion}`,
    docsPath: "",
    menu: docsMenu,
    group: "primary",
    surfaces: ["desktop", "mobile"],
  },
  {
    id: "playground",
    kind: "internal",
    label: "Play",
    href: "/play",
    group: "primary",
    surfaces: ["desktop", "mobile"],
  },
  {
    id: "blog",
    kind: "internal",
    label: "Blog",
    href: "/blog",
    group: "primary",
    surfaces: ["desktop", "mobile"],
  },
  {
    id: "community",
    kind: "internal",
    label: "Community",
    href: "/community-hub",
    menu: communityMenu,
    group: "primary",
    surfaces: ["desktop", "mobile"],
  },
  {
    id: "effect-days",
    kind: "internal",
    label: "Effect Days",
    href: "/effect-days",
    group: "primary",
    surfaces: ["desktop", "mobile"],
  },
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

export interface NavigationContext {
  readonly activeSlug?: NavigationActiveSlug | undefined
  readonly docsSection?: DocsNavSection | undefined
  readonly version?: string | undefined
}

export interface NavigationEntryView {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly href: string
  readonly external: boolean
  readonly active: boolean
  readonly alternates: ReadonlyArray<{
    readonly label: string
    readonly href: string
  }>
}

export interface NavigationItemView {
  readonly link: NavigationLink
  readonly href: string
  readonly active: boolean
  readonly entries: ReadonlyArray<NavigationEntryView>
}

const resolveHref = (
  target: { readonly href: string; readonly docsPath?: DocsPath },
  version: string,
): string =>
  target.docsPath === undefined
    ? target.href
    : `/docs/${version}${target.docsPath}`

// Resolves versions and active state once, so components only render.
export const buildNavigation = (
  surface: NavigationSurface,
  group: NavigationGroup,
  {
    activeSlug,
    docsSection,
    version = defaultDocsVersion,
  }: NavigationContext = {},
): ReadonlyArray<NavigationItemView> =>
  getNavigationLinks(surface, group).map((link): NavigationItemView => {
    const menu = link.kind === "internal" ? (link.menu ?? []) : []
    return {
      link,
      href: resolveHref(link, version),
      active:
        activeSlug !== undefined &&
        (link.id === activeSlug ||
          menu.some((entry) => entry.slug === activeSlug)),
      entries: menu.map((entry) => ({
        id: entry.id,
        label: entry.label,
        description: entry.description,
        href: resolveHref(entry, version),
        external: entry.href.startsWith("https://"),
        active:
          entry.slug !== undefined &&
          entry.slug === activeSlug &&
          (entry.docsSection === undefined ||
            entry.docsSection === docsSection),
        alternates:
          entry.docsPath === undefined
            ? []
            : DOCS_VERSIONS.filter(({ value }) => value !== version).map(
                ({ value, label }) => ({
                  label,
                  href: `/docs/${value}${entry.docsPath}`,
                }),
              ),
      })),
    }
  })
