import { File } from "@/domain/Workspace"

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
