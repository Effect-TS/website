import { Workspace } from "@/domain/Workspace"
import { themeRx } from "@/rx/theme"
import { Rx } from "@effect-rx/rx-react"
import { Effect, Layer, Stream } from "effect"
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

export const terminalSizeRx = Rx.make(0)

export const workspaceHandleRx = Rx.family((workspace: Workspace) =>
  runtime
    .rx((get) =>
      Effect.gen(function* () {
        const { spawn } = yield* Terminal
        yield* Effect.log("building")
        const handle = yield* WebContainer.workspace(workspace)

        const prepare = yield* handle
          .run(workspace.prepare ?? "pnpm install")
          .pipe(Effect.forkScoped)

        const selectedFile = Rx.make(workspace.initialFile)

        const solved = Rx.make(false)

        const terminal = Rx.make((get) =>
          Effect.gen(function* () {
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

            terminal.write("Loading workspace...\n")

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

        yield* get.stream(solved, {
          withoutInitialValue: true
        }).pipe(
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
      }).pipe(Effect.annotateLogs({
        workspace: workspace.name,
        rx: "workspaceHandleRx"
      }))
    )
    .pipe(Rx.setIdleTTL("20 seconds"))
)

export interface WorkspaceHandle
  extends Rx.Rx.InferSuccess<ReturnType<typeof workspaceHandleRx>> {}
