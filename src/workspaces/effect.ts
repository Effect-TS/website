import { FileWithContent, Workspace } from "@/domain/Workspace"

export const effectWorkspace = new Workspace({
  name: "effect",
  files: [
    new FileWithContent({
      file: "package.json",
      initialContent: JSON.stringify({
        dependencies: {
          effect: "latest",
          "@effect/platform": "latest",
          "@effect/platform-node": "latest",
          tsx: "latest"
        }
      })
    })
  ],
  filesOfInterest: []
})
