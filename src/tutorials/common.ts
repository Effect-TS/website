import { File, WorkspaceShell } from "@/domain/Workspace"
import content from "../../snapshots/tutorials/package.json"
import { Tutorial } from "contentlayer/generated"

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

export const shellLayouts: Record<
  Tutorial["shellLayout"],
  ReadonlyArray<WorkspaceShell>
> = {
  watch: [new WorkspaceShell({ command: "../run src/main.ts" })],
  server: [
    new WorkspaceShell({ label: "Server", command: "../run src/main.ts" }),
    new WorkspaceShell({ label: "Client" })
  ]
}
