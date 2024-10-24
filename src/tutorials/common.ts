import {
  File,
  Workspace,
  WorkspaceShell
} from "@/workspaces/domain/workspace"
import { Tutorial } from "contentlayer/generated"
import type { ReadonlyRecord } from "effect/Record"
import packageJson from "../../snapshots/package.json"

const baseWorkspace = new Workspace({
  name: "default",
  dependencies: packageJson.dependencies,
  shells: [new WorkspaceShell({ command: "../run src/main.ts" })],
  initialFilePath: "src/main.ts",
  tree: []
})

export const devToolsLayer = new File({
  name: "DevTools.ts",
  initialContent: `import { DevTools } from "@effect/experimental"
import { NodeSocket } from "@effect/platform-node"
import { Layer } from "effect"

export const DevToolsLive = DevTools.layerSocket.pipe(
  Layer.provide(NodeSocket.layerNet({ port: 34437 }))
)`
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
