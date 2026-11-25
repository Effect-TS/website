export const NAVIGATION_EVENTS = {
  SEARCH_OPEN: "effect-search:open",
  SEARCH_OPENED: "effect-search:opened",
  SEARCH_CLOSE: "effect-search:close",
  MOBILE_MENU_OPEN: "effect-mobile-menu:open",
}

export type NavigationActiveSlug =
  | "api"
  | "blog"
  | "podcast"
  | "motw"
  | "jobs"
  | "docs"
  | "playground"
  | "community"
  | "adoption-partners"
  | "merch"
  | "effect-days"

export interface NavigationLink {
  readonly kind: "link"
  readonly id: NavigationActiveSlug
  readonly label: string
  readonly href: `/${string}`
}

export interface NavigationMenuItem {
  /** Absent for items that leave the site, which can never be the current page. */
  readonly id?: NavigationActiveSlug
  readonly label: string
  readonly description: string
  readonly href: `/${string}` | `https://${string}`
}

export interface NavigationMenu {
  readonly kind: "menu"
  readonly id: string
  readonly label: string
  readonly items: ReadonlyArray<NavigationMenuItem>
}

export type NavigationEntry = NavigationLink | NavigationMenu

/**
 * The primary navigation, in desktop order. The mobile drawer lists the plain
 * links first and the menus as labelled groups below them.
 */
export const PRIMARY_NAVIGATION: ReadonlyArray<NavigationEntry> = [
  { kind: "link", id: "docs", label: "Docs", href: "/docs/v4" },
  { kind: "link", id: "playground", label: "Play", href: "/play" },
  {
    kind: "menu",
    id: "resources",
    label: "Resources",
    items: [
      {
        id: "blog",
        label: "Blog",
        description: "Releases and notes from the team",
        href: "/blog",
      },
      {
        id: "podcast",
        label: "Podcast",
        description: "Engineers using Effect in production",
        href: "/podcast",
      },
      {
        id: "motw",
        label: "Module of the Week",
        description: "One lesser-known module at a time",
        href: "/module-of-the-week",
      },
      {
        label: "Effect UI",
        description: "The new frontend library, in preview",
        href: "https://ui.effect.website",
      },
      {
        label: "Workshops",
        description: "Recorded sessions on YouTube",
        href: "https://www.youtube.com/playlist?list=PLDf3uQLaK2B9vHzUNyvOSvoMv61LW7792",
      },
    ],
  },
  {
    kind: "menu",
    id: "community",
    label: "Community",
    items: [
      {
        id: "community",
        label: "Community hub",
        description: "Meetups, talks and events",
        href: "/community-hub",
      },
      {
        id: "jobs",
        label: "Jobs",
        description: "Open roles using Effect",
        href: "/effect-jobs",
      },
      {
        id: "adoption-partners",
        label: "Adoption partner",
        description: "Get help adopting Effect",
        href: "/adoption-partners/ziverge",
      },
      {
        id: "merch",
        label: "Merch",
        description: "Effect-branded merchandise",
        href: "/merch",
      },
    ],
  },
  {
    kind: "link",
    id: "effect-days",
    label: "Effect Days",
    href: "/effect-days",
  },
]

export const isExternalHref = (href: string): href is `https://${string}` =>
  href.startsWith("https://")

export const SOCIAL_NAVIGATION_LINKS = [
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/Effect-TS/effect",
  },
  {
    id: "discord",
    label: "Discord",
    href: "https://discord.gg/effect-ts",
  },
] as const
