import { File } from "@/domain/Workspace"
import * as Package from "../../package.json"

const allDeps = {
  ...Package.dependencies,
  ...Package.devDependencies
}
const version = (name: keyof typeof allDeps) =>
  allDeps[name].replace(/^\^/, "")

export const tutorialPackageJson = new File({
  name: "package.json",
  language: "json",
  initialContent: JSON.stringify(
    {
      type: "module",
      dependencies: {
        effect: version("effect"),
        "@effect/platform": version("@effect/platform"),
        "@effect/platform-node": version("@effect/platform-node"),
        "@effect/schema": version("@effect/schema"),
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
