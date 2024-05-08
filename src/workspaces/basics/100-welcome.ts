/* eslint-disable import/no-anonymous-default-export */
import { Directory, File, Workspace } from "@/domain/Workspace"
import { defaultCommand, effectPackageJson } from "../common"

export default new Workspace({
  name: "100-welcome",
  command: defaultCommand,
  tree: [
    effectPackageJson,
    new Directory("src", [
      new File({
        name: "index.ts",
        initialContent: `import { Effect } from "effect"

Effect.runFork(Effect.log("Welcome to Effect!"))`
      })
    ])
  ]
})
