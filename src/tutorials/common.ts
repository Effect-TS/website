import { File } from "@/domain/Workspace"
import content from "../../snapshots/tutorials/package.json"

export const tutorialsPackageJson = new File({
  name: "package.json",
  language: "json",
  initialContent: JSON.stringify(
    {
      ...content,
      packageManager: undefined
    },
    null,
    2
  )
})
