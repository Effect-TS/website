/* eslint-disable import/no-anonymous-default-export */
import { Directory, File, Workspace } from "@/domain/Workspace"
import { effectPackageJson } from "../common"

export default new Workspace({
  name: "step-01",
  command: "tsx --watch src/index.ts",
  tree: [
    effectPackageJson,
    new Directory("src", [
      new File({
        name: "index.ts",
        initialContent: `import { Effect } from "effect"

Effect.runFork(Effect.log("Hello, world!"))`
      })
    ])
  ]
})
