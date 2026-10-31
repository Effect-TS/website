export const learnParts = [
  { part: 1, title: "Effect from zero", venue: "In the browser" },
  { part: 2, title: "A real program on your machine", venue: "Local" },
  { part: 3, title: "Make it reliable", venue: "Local" },
  { part: 4, title: "On your own", venue: "Local" },
] as const

export const starterCommands = [
  "npx degit Effect-TS/website/courses/rulebook rulebook",
  "cd rulebook",
  "pnpm install",
  "pnpm run doctor --viewer",
].join("\n")
