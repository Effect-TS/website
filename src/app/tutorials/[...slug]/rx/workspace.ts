import { Workspace } from "@/domain/Workspace"
import { Terminal } from "@/services/Terminal"
import { WebContainer } from "@/services/WebContainer"
import { Rx } from "@effect-rx/rx-react"
import { Effect, Layer } from "effect"

const runtime = Rx.runtime(
  Layer.mergeAll(WebContainer.Live, Terminal.Live)
).pipe(Rx.setIdleTTL("5 seconds"))

export const selectedFileRx = Rx.make(0)

export const workspaceHandleRx = Rx.family((workspace: Workspace) =>
  runtime.rx(
    Effect.gen(function* () {
      const { spawn } = yield* Terminal
      const handle = yield* WebContainer.workspace(workspace)

      const terminal = Rx.make(
        Effect.gen(function* (_) {
          const shell = yield* handle.shell
          const terminal = yield* spawn
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
