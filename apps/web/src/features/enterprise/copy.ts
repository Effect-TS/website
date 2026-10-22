/** Static copy of the enterprise page. No rendering and no assets here. */

export type IconName =
  | "calendar-check"
  | "chart-line"
  | "file-search"
  | "folder-git"
  | "git-branch"
  | "graduation-cap"
  | "life-buoy"
  | "shield-check"

export const CONTACT_EMAIL = "contact@effectful.co"
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}?subject=Effect%20for%20enterprise`
export const SPONSORSHIP_HREF = `mailto:${CONTACT_EMAIL}?subject=Sponsorship`
export const DISCORD_URL = "https://discord.gg/effect-ts"
export const POLICY_UPDATED = "Oct 01, 2026"

export const PAGE_QUESTIONS = [
  { href: "#support", label: "Who can help us adopt and operate it?" },
  { href: "#security", label: "What happens with a security issue?" },
  { href: "#adoption-guide", label: "How do we propose it internally?" },
] as const

export const facts = (currentVersion: string) =>
  [
    { label: "Current release", value: `v${currentVersion}` },
    { label: "License", value: "MIT" },
    { label: "Enterprise support", value: "NDA and SLAs" },
    { label: "Private channels", value: "Slack or Discord" },
  ] as const

export const RELEASE_PRACTICES: ReadonlyArray<{
  readonly icon: IconName
  readonly title: string
  readonly body: string
  /** The release policy owner still has to confirm this. */
  readonly tbd?: true
}> = [
  {
    icon: "git-branch",
    title: "Versioning",
    body: "Semantic versioning. Stable modules break only in a new major; effect/unstable/* can change in a minor.",
  },
  {
    icon: "shield-check",
    title: "Long-term support",
    body: "Each major line is supported on a published LTS schedule. 4.x is the current LTS.",
  },
  {
    icon: "calendar-check",
    title: "Release cadence",
    body: "How often minor and patch releases ship, and how schedule changes are announced.",
    tbd: true,
  },
  {
    icon: "life-buoy",
    title: "Maintenance",
    body: "Supported lines receive fixes and security patches until end of life. 3.x stays in maintenance alongside 4.x.",
  },
]

export const RELEASE_COLUMNS = [
  "Release",
  "Status",
  "Stable since",
  "Upgrade guide",
] as const

export interface ReleaseLine {
  readonly line: string
  readonly status: string
  readonly current: boolean
  readonly stable: string
  readonly upgrade: { readonly label: string; readonly href: string }
}

export const RELEASES: ReadonlyArray<ReleaseLine> = [
  {
    line: "4.x",
    status: "Current, LTS",
    current: true,
    stable: "Oct 2026",
    upgrade: { label: "Migrating from 3.x", href: "/blog/releases/effect/40" },
  },
  {
    line: "3.x",
    status: "Maintenance",
    current: false,
    stable: "Apr 2024",
    upgrade: {
      label: "Changelog",
      href: "https://github.com/Effect-TS/effect/releases",
    },
  },
]

export const CHANGELOG_HREF = "https://github.com/Effect-TS/effect/releases"
export const STORIES_HREF =
  "https://www.youtube.com/playlist?list=PLDf3uQLaK2lbPLQT6I6xkiV_W3NxnPXRE"

export const SUPPORT_OPTIONS: ReadonlyArray<{
  readonly icon: IconName
  readonly title: string
  readonly body: string
}> = [
  {
    icon: "file-search",
    title: "Talk through adoption",
    body: "Bring us your technical questions and plans for using Effect.",
  },
  {
    icon: "life-buoy",
    title: "Establish a support relationship",
    body: "A support agreement with a mutual NDA, service levels, and escalation. Private channels are arranged separately.",
  },
  {
    icon: "graduation-cap",
    title: "Get hands-on help",
    body: "Implementation, consulting, or training through an adoption partner like Ziverge.",
  },
]

export const SECURITY_LINKS: ReadonlyArray<{
  readonly icon: IconName
  readonly title: string
  readonly body: string
  readonly href: string
}> = [
  {
    icon: "folder-git",
    title: "Source and license",
    body: "Developed in public, MIT licensed.",
    href: "https://github.com/Effect-TS/effect",
  },
  {
    icon: "shield-check",
    title: "Security reporting and advisories",
    body: "Private reports, public advisories.",
    href: "https://github.com/Effect-TS/effect/security",
  },
  {
    icon: "chart-line",
    title: "npm package",
    body: "Versions, release history, and weekly downloads.",
    href: "https://www.npmjs.com/package/effect",
  },
]

export const PROPOSAL_TEMPLATE = `# Proposal to adopt Effect

## Problem we want to solve
Describe the current problem and why it matters.

## Proposed use of Effect
Where Effect is introduced and its integration boundaries.

## Pilot and success criteria
A bounded trial, how it is evaluated, and the decision after.

## Team preparation
Learning, training, review, and ownership needs.

## Maintenance plan
Release line, support window, upgrade expectations.

## Security and licensing
License, advisory process, internal review.

## Support and staffing
Internal owners, Effect support, partner help.

## Tradeoffs and exit plan
Adoption costs, open questions, how we'd change course.

## Recommendation
Next step, owner, and review date.`

/** Answers are HTML: the shared FAQ block renders them as is. */
export const FAQS: ReadonlyArray<{
  readonly question: string
  readonly answer: string
}> = [
  {
    question: "Can we try Effect in part of an existing application?",
    answer:
      "<p>Yes. Start with a bounded use case and assess how it fits your existing code, team, and delivery process.</p>",
  },
  {
    question: "What support can our company arrange?",
    answer:
      "<p>Contact us to discuss your needs. We can talk through company support, private communication, and introductions to adoption partners. Any service levels and coverage are defined in an agreement.</p>",
  },
  {
    question: "Where can individual developers ask questions?",
    answer: `<p>Join our <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer">public Discord</a>. It is open to everyone, including engineers using Effect at work.</p>`,
  },
]
