export const learnParts = [
  { part: 1, title: "Effects, errors and services", venue: "In the browser" },
  { part: 2, title: "Programs, tests and APIs", venue: "Local" },
  {
    part: 3,
    title: "Persistence, background work and concurrency",
    venue: "Local",
  },
  { part: 4, title: "Layers and a final challenge", venue: "Local" },
] as const

export const starterCommands = [
  "npx degit Effect-TS/website/courses/rulebook rulebook",
  "cd rulebook",
  "pnpm install",
  "pnpm run doctor --viewer",
].join("\n")
