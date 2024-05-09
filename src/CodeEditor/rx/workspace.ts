import { Workspace } from "@/domain/Workspace"
import { themeRx } from "@/rx/theme"
import { Rx } from "@effect-rx/rx-react"
import { Effect, Layer, Option, Stream } from "effect"
import { GithubTheme, MonokaiSodaTheme, Terminal } from "../services/Terminal"
import { WebContainer } from "../services/WebContainer"

const runtime = Rx.runtime(
  Layer.mergeAll(WebContainer.Live, Terminal.Live)
).pipe(Rx.setIdleTTL("5 seconds"))

const terminalTheme = Rx.map(themeRx, (theme) =>
  theme === "light" ? GithubTheme : MonokaiSodaTheme
)

export const workspaceRx = Rx.make(Option.none<Workspace>())

export const terminalSizeRx = Rx.make(0)

export const workspaceHandleRx = runtime
  .rx((get) =>
    Effect.gen(function* () {
      const workspace = yield* get(workspaceRx).pipe(
        Effect.orElse(() => Effect.never)
      )
      const { spawn } = yield* Terminal
      const handle = yield* WebContainer.workspace(workspace)

      const selectedFile = Rx.make(workspace.initialFile)

      const solved = Rx.make(false)

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
            `cd "${workspace.name}" && pnpm install${
              workspace.command ? ` && ${workspace.command}` : ""
            }\n`
          )

          get.subscribe(terminalTheme, (theme) => {
            terminal.options = {
              theme
            }
          })

          yield* get.stream(terminalSizeRx).pipe(
            Stream.debounce(250),
            Stream.runForEach(() => resize),
            Effect.forkScoped
          )

          return terminal
        })
      )

      yield* get.stream(solved).pipe(
        Stream.filter((solved) => solved),
        Stream.runForEach(() =>
          Effect.forEach(workspace.filePaths, ([file, path]) =>
            file.solution ? handle.write(path, file.solution) : Effect.void
          )
        ),
        Effect.forkScoped
      )

      return {
        workspace,
        handle,
        terminal,
        selectedFile,
        solved
      } as const
    })
  )
  .pipe(Rx.setIdleTTL("10 seconds"))

export interface WorkspaceHandle
  extends Rx.Rx.InferSuccess<typeof workspaceHandleRx> {}
