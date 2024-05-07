import { BrowserStream } from "@effect/platform-browser"
import { FitAddon } from "@xterm/addon-fit"
import { Terminal as XTerm } from "@xterm/xterm"
import { Effect, Layer, Stream } from "effect"

const make = Effect.gen(function* () {
  const spawn = Effect.gen(function* () {
    const terminal = yield* Effect.acquireRelease(
      Effect.sync(() => new XTerm({ convertEol: true })),
      (terminal) => Effect.sync(() => terminal.dispose())
    )
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    const prevOpen = terminal.open
    terminal.open = function () {
      prevOpen.apply(terminal, arguments as any)
      fitAddon.fit()
    }

    yield* BrowserStream.fromEventListenerWindow("resize").pipe(
      Stream.debounce(500),
      Stream.runForEach(() => Effect.sync(() => fitAddon.fit())),
      Effect.forkScoped
    )

    return terminal
  })

  return { spawn } as const
})

export class Terminal extends Effect.Tag("app/Terminal")<
  XTerm,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make)
}
