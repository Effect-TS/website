export const learnParts = [
  { part: 1, title: "Effects, errors and services", venue: "In the browser" },
  { part: 2, title: "Platform services, tests and typed APIs", venue: "Local" },
  {
    part: 3,
    title: "Persistence, background work and concurrency",
    venue: "Local",
  },
  { part: 4, title: "Compose layers, then work on your own", venue: "Local" },
] as const

export const starterCommands = [
  "npx degit Effect-TS/website/courses/rulebook rulebook",
  "cd rulebook",
  "pnpm install",
  "pnpm run doctor --viewer",
].join("\n")
