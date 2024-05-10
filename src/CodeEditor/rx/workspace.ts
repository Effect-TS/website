import { Workspace } from "@/domain/Workspace"
import { themeRx } from "@/rx/theme"
import { Rx } from "@effect-rx/rx-react"
import { Effect, Layer, Option, Stream } from "effect"
import {
  MonokaiSodaTheme,
  NightOwlishLightTheme,
  Terminal
} from "../services/Terminal"
import { WebContainer } from "../services/WebContainer"

const runtime = Rx.runtime(
  Layer.mergeAll(WebContainer.Live, Terminal.Live)
).pipe(Rx.setIdleTTL("30 seconds"))

const terminalTheme = Rx.map(themeRx, (theme) =>
  theme === "light" ? NightOwlishLightTheme : MonokaiSodaTheme
)

export const workspaceRx = Rx.make(Option.none<Workspace>())

export const terminalSizeRx = Rx.make(0)

export const workspaceHandleRx = runtime
  .rx((get) =>
    Effect.gen(function* () {
      const workspace = yield* get.some(workspaceRx)
      const { spawn } = yield* Terminal
      const handle = yield* WebContainer.workspace(workspace)

      const prepare = yield* handle
        .run(workspace.prepare ?? "pnpm install")
        .pipe(Effect.forkScoped)

      const selectedFile = Rx.make(workspace.initialFile)

      const solved = Rx.make(false)

      const terminal = Rx.make((get) =>
        Effect.gen(function* (_) {
          const shell = yield* handle.shell
          const { terminal, resize } = yield* spawn({
            theme: get.once(terminalTheme)
          })
          const input = shell.input.getWriter()

          const mount = Effect.sync(() => {
            shell.output.pipeTo(
              new WritableStream({
                write(data) {
                  terminal.write(data)
                }
              })
            )
            terminal.onData((data) => {
              input.write(data)
            })
          })

          yield* Effect.gen(function* () {
            input.write(`cd "${workspace.name}" && clear\n`)
            yield* prepare.await
            if (workspace.command) {
              yield* Effect.sleep(3000)
              yield* mount
              input.write(`${workspace.command}\n`)
            } else {
              yield* mount
            }
          }).pipe(Effect.forkScoped)

          get.subscribe(terminalTheme, (theme) => {
            terminal.options.theme = theme
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
        Stream.drop(1),
        Stream.runForEach((solve) =>
          Effect.forEach(workspace.filePaths, ([file, path]) =>
            handle.write(
              path,
              solve
                ? file.solution ?? file.initialContent
                : file.initialContent
            )
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
