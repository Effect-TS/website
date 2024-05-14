import { File, Workspace, WorkspaceShell } from "@/domain/Workspace"
import content from "../../snapshots/tutorials/package.json"
import { Tutorial } from "contentlayer/generated"
import { ReadonlyRecord } from "effect/Record"

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

const baseWorkspace = new Workspace({
  name: "default",
  prepare: "pnpm add tsx",
  shells: [new WorkspaceShell({ command: "../run src/main.ts" })],
  snapshot: "tutorials",
  initialFilePath: "src/main.ts",
  tree: [tutorialsPackageJson]
})

export const tutorialWorkspaces: ReadonlyRecord<
  Tutorial["workspace"],
  Workspace
> = {
  default: baseWorkspace,

  express: new Workspace({
    ...baseWorkspace,
    name: "express",
    shells: [
      new WorkspaceShell({ label: "Server", command: "../run src/main.ts" }),
      new WorkspaceShell({ label: "Client" })
    ],
    tree: [
      new File({
        name: "package.json",
        language: "json",
        initialContent: JSON.stringify(
          {
            ...content,
            packageManager: undefined,
            express: "latest"
          },
          null,
          2
        )
      })
    ]
  })
}
