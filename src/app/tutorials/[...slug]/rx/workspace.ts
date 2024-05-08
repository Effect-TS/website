import { Workspace } from "@/domain/Workspace"
import { themeRx } from "@/rx/theme"
import { GithubTheme, MonokaiSodaTheme, Terminal } from "@/services/Terminal"
import { WebContainer } from "@/services/WebContainer"
import { Rx } from "@effect-rx/rx-react"
import { Effect, Layer, Stream } from "effect"

const runtime = Rx.runtime(
  Layer.mergeAll(WebContainer.Live, Terminal.Live)
).pipe(Rx.setIdleTTL("5 seconds"))

const terminalTheme = Rx.map(themeRx, (theme) =>
  theme === "light" ? GithubTheme : MonokaiSodaTheme
)

export const workspaceHandleRx = Rx.family((workspace: Workspace) =>
  runtime.rx(
    Effect.gen(function* () {
      const { spawn } = yield* Terminal
      const handle = yield* WebContainer.workspace(workspace)

      const size = Rx.make(0)

      const selectedFile = Rx.make(workspace.initialFile)

      const terminal = Rx.make((get) =>
        Effect.gen(function* (_) {
          const shell = yield* handle.shell
          const { terminal, resize } = yield* spawn({
            theme: get.once(terminalTheme)
          })
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
            `cd "${workspace.name}" && pnpm install && clear${
              workspace.command ? ` && ${workspace.command}` : ""
            }\n`
          )

          get.subscribe(terminalTheme, (theme) => {
            console.log(theme)
            terminal.options = {
              theme
            }
          })

          yield* get.stream(size).pipe(
            Stream.debounce(250),
            Stream.runForEach(() => resize),
            Effect.forkScoped
          )

          return terminal
        })
      )

      return { workspace, handle, terminal, size, selectedFile } as const
    })
  )
)

export interface WorkspaceHandle
  extends Rx.Rx.InferSuccess<ReturnType<typeof workspaceHandleRx>> {}
