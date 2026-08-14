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

export interface InternalNavigationLink extends NavigationLinkBase {
  readonly kind: "internal"
  readonly href: `/${string}`
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
  | "docs"
  | "playground"
  | "community"
  | "effect-days"

export const LANDING_NAVIGATION_LINKS: ReadonlyArray<NavigationLink> = [
  {
    id: "docs",
    kind: "internal",
    label: "Docs",
    href: "/docs/v4",
    group: "primary",
    surfaces: ["desktop", "mobile"],
  },
  {
    id: "api",
    kind: "internal",
    label: "API",
    href: "/docs/v4/api",
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
    id: "podcast",
    kind: "internal",
    label: "Podcast",
    href: "/podcast",
    group: "primary",
    surfaces: ["desktop", "mobile"],
  },
  {
    id: "community",
    kind: "internal",
    label: "Community",
    href: "/community-hub",
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

export const applyVersionToLinks = (
  version: string,
  links: ReadonlyArray<NavigationLink>,
): ReadonlyArray<NavigationLink> => {
  return links.map((link): NavigationLink => {
    if (link.kind !== "internal") return link
    if (link.id === "docs")
      return { ...link, href: `/docs/${version}` as `/${string}` }
    if (link.id === "api")
      return { ...link, href: `/docs/${version}/api` as `/${string}` }
    return link
  })
}
