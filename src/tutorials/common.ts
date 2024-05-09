import { File } from "@/domain/Workspace"

export const defaultCommand = "clear && tsx --watch src/index.ts"

export const effectPackageJson = new File({
  name: "package.json",
  language: "json",
  initialContent: JSON.stringify(
    {
      dependencies: {
        effect: "latest",
        "@effect/platform": "latest",
        "@effect/platform-node": "latest",
        "@effect/schema": "latest",
        tsx: "latest"
      }
    },
    null,
    2
  ),
  interesting: false
})

export const emptyPackageJson = new File({
  name: "package.json",
  language: "json",
  initialContent: JSON.stringify(
    {
      dependencies: {
        tsx: "latest"
      }
    },
    null,
    2
  ),
  interesting: false
})
