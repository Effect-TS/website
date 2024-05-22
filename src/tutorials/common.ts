import { Workspace, WorkspaceShell } from "@/domain/Workspace"
import packageJson from "../../snapshots/tutorials/package.json"
import { Tutorial } from "contentlayer/generated"
import { ReadonlyRecord } from "effect/Record"

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
