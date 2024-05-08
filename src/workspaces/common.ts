import { File } from "@/domain/Workspace"

export const effectPackageJson = new File({
  name: "package.json",
  initialContent: JSON.stringify({
    dependencies: {
      effect: "latest",
      "@effect/platform": "latest",
      "@effect/platform-node": "latest",
      tsx: "latest"
    }
  }),
  interesting: false
})
