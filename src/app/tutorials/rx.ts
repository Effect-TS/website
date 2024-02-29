import { WebContainer, Workspace } from "@/services/WebContainer"
import { Rx } from "@effect-rx/rx-react"
import { Effect, Stream } from "effect"
import { Terminal } from "xterm"

const { workspace } = Effect.serviceFunctions(WebContainer)

const runtime = Rx.runtime(WebContainer.Live).pipe(Rx.setIdleTTL("5 seconds"))

export const workspaceRx = Rx.family((ws: Workspace) => {
  const rx = runtime.rx(workspace(ws)).pipe(Rx.setIdleTTL("3 seconds"))

  const terminal = Rx.make((get) =>
    Effect.gen(function* (_) {
      const shell = yield* _(
        get.result(rx),
        Effect.flatMap((_) => _.shell)
      )
      const terminal = yield* _(
        Effect.acquireRelease(
          Effect.sync(() => new Terminal({ convertEol: true })),
          (terminal) => Effect.sync(() => terminal.dispose())
        )
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
        `cd "${ws.name}" && pnpm install && tsx --watch "${ws.filesOfInterest[0].file}"\n`
      )
      return terminal
    })
  )

  const files = Rx.mapResult(rx, (handle) =>
    ws.filesOfInterest.map((file) => {
      const content = Rx.make(file.initialContent)
      const write = Rx.make((get) =>
        get.stream(content).pipe(
          Stream.debounce("1 seconds"),
          Stream.runForEach((_) => handle.write(file.file, _))
        )
      )
      return [
        file,
        Rx.writable(
          (get) => get(write),
          (ctx, _: string) => {
            ctx.set(content, _)
          }
        )
      ] as const
    })
  )

  return { rx, terminal, files }
})
