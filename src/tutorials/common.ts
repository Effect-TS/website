import { File } from "@/domain/Workspace"

export const tutorialPackageJson = new File({
  name: "package.json",
  language: "json",
  initialContent: JSON.stringify(
    {
      type: "module",
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
  )
})

export const emptyPackageJson = new File({
  name: "package.json",
  language: "json",
  initialContent: JSON.stringify(
    {
      type: "module",
      dependencies: {
        tsx: "latest"
      }
    },
    null,
    2
  )
})
