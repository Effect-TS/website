import { FitAddon } from "@xterm/addon-fit"
import {
  ITerminalInitOnlyOptions,
  ITerminalOptions,
  Terminal as XTerm
} from "@xterm/xterm"
import { Effect, Layer } from "effect"

const make = Effect.gen(function* () {
  const spawn = (options: ITerminalOptions | ITerminalInitOnlyOptions) =>
    Effect.gen(function* () {
      const terminal = yield* Effect.acquireRelease(
        Effect.sync(() => new XTerm(options)),
        (terminal) => Effect.sync(() => terminal.dispose())
      )
      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)

      const prevOpen = terminal.open
      terminal.open = function () {
        prevOpen.apply(terminal, arguments as any)
        fitAddon.fit()
      }

      return {
        terminal,
        resize: Effect.sync(() => {
          fitAddon.fit()
        })
      }
    })

  return { spawn } as const
})

export class Terminal extends Effect.Tag("app/Terminal")<
  XTerm,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make)
}

export const MonokaiSodaTheme = {
  foreground: "#c4c5b5",
  background: "#1a1a1a",
  cursor: "#f6f7ec",

  black: "#1a1a1a",
  brightBlack: "#625e4c",

  red: "#f4005f",
  brightRed: "#f4005f",

  green: "#98e024",
  brightGreen: "#98e024",

  yellow: "#fa8419",
  brightYellow: "#e0d561",

  blue: "#9d65ff",
  brightBlue: "#9d65ff",

  magenta: "#f4005f",
  brightMagenta: "#f4005f",

  cyan: "#58d1eb",
  brightCyan: "#58d1eb",

  white: "#c4c5b5",
  brightWhite: "#f6f6ef"
}

export const GithubTheme = {
  foreground: "#3e3e3e",
  background: "#f4f4f4",
  cursor: "#3f3f3f",

  black: "#3e3e3e",
  brightBlack: "#666666",

  red: "#970b16",
  brightRed: "#de0000",

  green: "#07962a",
  brightGreen: "#87d5a2",

  yellow: "#f8eec7",
  brightYellow: "#f1d007",

  blue: "#003e8a",
  brightBlue: "#2e6cba",

  magenta: "#e94691",
  brightMagenta: "#ffa29f",

  cyan: "#89d1ec",
  brightCyan: "#1cfafe",

  white: "#ffffff",
  brightWhite: "#ffffff"
}
