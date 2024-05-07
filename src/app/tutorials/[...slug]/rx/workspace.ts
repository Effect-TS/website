import { Workspace } from "@/domain/Workspace"
import { WebContainer } from "@/app/tutorials/[...slug]/services/WebContainer"
import { Rx } from "@effect-rx/rx-react"
import { Effect } from "effect"
import { Terminal } from "xterm"

const runtime = Rx.runtime(WebContainer.Live).pipe(Rx.setIdleTTL("5 seconds"))

export const selectedFileRx = Rx.make(0)

export const workspaceHandleRx = Rx.family((workspace: Workspace) =>
  runtime.rx(
    Effect.gen(function* () {
      const handle = yield* WebContainer.workspace(workspace)

      const terminal = Rx.make(
        Effect.gen(function* (_) {
          const shell = yield* handle.shell
          const terminal = yield* Effect.acquireRelease(
            Effect.sync(() => new Terminal({ convertEol: true })),
            (terminal) => Effect.sync(() => terminal.dispose())
          )
          shell.output.pipeTo(
            new WritableStream({
              write(data) {
                terminal.write(data)
              }
            })
          )
          const input = shell.input.getWriter()
          terminal.onData((data) => {
            input.write(data)
          })
          input.write(
            `cd "${workspace.name}" && pnpm install && tsx --watch "${workspace.filesOfInterest[0].file}"\n`
          )
          return terminal
        })
      )

      return { workspace, handle, terminal } as const
    })
  )
)

export interface WorkspaceHandle
  extends Rx.Rx.InferSuccess<ReturnType<typeof workspaceHandleRx>> {}
