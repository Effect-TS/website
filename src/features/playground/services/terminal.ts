import { FitAddon } from "@xterm/addon-fit"
import {
  type ITerminalInitOnlyOptions,
  type ITerminalOptions,
  Terminal as XTerm,
} from "@xterm/xterm"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"

export interface SpawnedTerminal {
  readonly terminal: XTerm
  readonly resize: Effect.Effect<void>
}

export class Terminal extends Context.Service<
  Terminal,
  {
    readonly spawn: (
      options: ITerminalOptions | ITerminalInitOnlyOptions,
    ) => Effect.Effect<SpawnedTerminal, never, Scope.Scope>
  }
>()("app/Terminal") {
  static readonly layer = Layer.succeed(this, {
    spawn: Effect.fnUntraced(function* (options) {
      let resizeObserver: ResizeObserver | undefined
      const terminal = yield* Effect.acquireRelease(
        Effect.sync(() => new XTerm(options)),
        (terminal) =>
          Effect.sync(() => {
            resizeObserver?.disconnect()
            terminal.dispose()
          }),
      )

      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)

      const prevOpen = terminal.open
      terminal.open = function (this: XTerm, parent: HTMLElement) {
        prevOpen.call(this, parent)
        fitAddon.fit()
        resizeObserver = new ResizeObserver(() => fitAddon.fit())
        resizeObserver.observe(parent)
      }

      return {
        terminal,
        resize: Effect.sync(() => {
          fitAddon.fit()
        }),
      }
    }),
  })
}
