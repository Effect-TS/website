import {
  Workspace,
  WorkspaceShell
} from "@/components/editor/domain/workspace"
import { Tutorial } from "contentlayer/generated"
import type { ReadonlyRecord } from "effect/Record"
import packageJson from "../../snapshots/tutorials/package.json"

const baseWorkspace = new Workspace({
  name: "default",
  dependencies: packageJson.dependencies,
  shells: [new WorkspaceShell({ command: "../run src/main.ts" })],
  snapshot: "tutorials",
  initialFilePath: "src/main.ts",
  tree: []
})

export const tutorialWorkspaces: ReadonlyRecord<
  Tutorial["workspace"],
  Workspace
> = {
  default: baseWorkspace,

  express: new Workspace({
    ...baseWorkspace,
    name: "express",
    dependencies: {
      ...packageJson.dependencies,
      express: "latest"
    },
    shells: [
      new WorkspaceShell({ label: "Server", command: "../run src/main.ts" }),
      new WorkspaceShell({ label: "Client" })
    ],
    tree: []
  })
}
