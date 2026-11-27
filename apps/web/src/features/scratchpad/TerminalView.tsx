import { FitAddon } from "@xterm/addon-fit"
import { type ITheme, Terminal } from "@xterm/xterm"
import "@xterm/xterm/css/xterm.css"
import * as React from "react"
import type { TerminalSize } from "./container.ts"
import type { TerminalOutput } from "./terminal.ts"

/** A clickable `path:line:col` in the terminal. */
export interface TerminalLocation {
  readonly path: string
  readonly line: number
  readonly column: number
}

const LOCATION_PATTERN =
  /((?:file:\/\/)?[\w./@-]+\.(?:tsx?|mts|cts|[cm]?js)):(\d+):(\d+)/g

/**
 * A location as the terminal prints it (`src/main.ts`, or a stack trace's
 * `file:///home/scratchpad/workspace/src/main.ts`), relative to the
 * Workspace, or `undefined` outside it (`node_modules`, Node internals).
 */
export const workspacePathOf = (raw: string): string | undefined => {
  let path = raw.replace(/^file:\/\//, "")
  const root = path.lastIndexOf("/workspace/")
  if (root !== -1) path = path.slice(root + "/workspace/".length)
  else if (path.startsWith("/")) return undefined
  path = path.replace(/^\.\//, "")
  return path.startsWith("node_modules/") || path.startsWith("../")
    ? undefined
    : path
}

const ansi = {
  light: {
    black: "#18181b",
    red: "#dc2626",
    green: "#059669",
    yellow: "#b45309",
    blue: "#2563eb",
    magenta: "#9333ea",
    cyan: "#0891b2",
    white: "#71717a",
    brightBlack: "#a1a1aa",
    brightRed: "#ef4444",
    brightGreen: "#10b981",
    brightYellow: "#d97706",
    brightBlue: "#3b82f6",
    brightMagenta: "#a855f7",
    brightCyan: "#06b6d4",
    brightWhite: "#3f3f46",
  },
  dark: {
    black: "#3f3f46",
    red: "#f87171",
    green: "#34d399",
    yellow: "#fbbf24",
    blue: "#60a5fa",
    magenta: "#c084fc",
    cyan: "#22d3ee",
    white: "#d4d4d8",
    brightBlack: "#71717a",
    brightRed: "#fca5a5",
    brightGreen: "#6ee7b7",
    brightYellow: "#fde68a",
    brightBlue: "#93c5fd",
    brightMagenta: "#d8b4fe",
    brightCyan: "#67e8f9",
    brightWhite: "#fafafa",
  },
}

/** The panel's colors; the background matches the panel (white / zinc-950). */
export const terminalTheme = (dark: boolean): ITheme =>
  dark
    ? {
        ...ansi.dark,
        background: "#09090b",
        foreground: "#e4e4e7",
        cursor: "#d4d4d8",
        cursorAccent: "#09090b",
        selectionBackground: "#3f3f46",
      }
    : {
        ...ansi.light,
        background: "#ffffff",
        foreground: "#27272a",
        cursor: "#3f3f46",
        cursorAccent: "#ffffff",
        selectionBackground: "#bfdbfe",
      }

/**
 * xterm measures glyphs on a canvas, which cannot resolve CSS variables, so
 * the site's mono font is read from `--font-jetbrains-mono` here.
 */
const monoFontFamily = () => {
  const site = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-jetbrains-mono")
    .trim()
  return `${site === "" ? "" : `${site}, `}"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`
}

const isDarkNow = () => document.documentElement.classList.contains("dark")

/** Follows the site theme (the `dark` class on `<html>`). */
export const useIsDark = (): boolean => {
  const [dark, setDark] = React.useState(isDarkNow)
  React.useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDarkNow()))
    observer.observe(document.documentElement, { attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])
  return dark
}

export interface TerminalViewProps {
  readonly output: TerminalOutput
  /** The terminal's size once it has been measured, then every resize. */
  readonly onOpen: (size: TerminalSize) => void
  readonly onResize: (size: TerminalSize) => void
  /** Keystrokes and pastes. */
  readonly onData: (data: string) => void
  /** Opens a clickable `path:line:col` (stack traces, tsc output). */
  readonly onOpenLocation?: ((location: TerminalLocation) => void) | undefined
  readonly className?: string | undefined
}

/**
 * The interactive xterm for the terminal's shell. It writes only what is new
 * in `output`, and replays it when `output.generation` changes (Clear) or
 * when it is created again.
 */
export function TerminalView({
  output,
  onOpen,
  onResize,
  onData,
  onOpenLocation,
  className,
}: TerminalViewProps) {
  const callbacks = React.useRef({
    onOpen,
    onResize,
    onData,
    onOpenLocation,
  })
  callbacks.current = { onOpen, onResize, onData, onOpenLocation }
  const hostRef = React.useRef<HTMLDivElement>(null)
  const terminalRef = React.useRef<Terminal | null>(null)
  const written = React.useRef({ generation: -1, total: 0 })
  const dark = useIsDark()

  React.useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: monoFontFamily(),
      // xterm's default, which the Playground's terminal uses.
      fontSize: 15,
      lineHeight: 1.4,
      scrollback: 5000,
      theme: terminalTheme(isDarkNow()),
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(host)
    const links = terminal.registerLinkProvider({
      provideLinks(row, callback) {
        const text = terminal.buffer.active
          .getLine(row - 1)
          ?.translateToString(true)
        if (
          callbacks.current.onOpenLocation === undefined ||
          text === undefined
        ) {
          return callback(undefined)
        }
        const found = [...text.matchAll(LOCATION_PATTERN)].flatMap((match) => {
          const path = workspacePathOf(match[1]!)
          if (path === undefined) return []
          return [
            {
              text: match[0],
              range: {
                start: { x: match.index + 1, y: row },
                end: { x: match.index + match[0].length, y: row },
              },
              decorations: { pointerCursor: true, underline: true },
              activate: () =>
                callbacks.current.onOpenLocation?.({
                  path,
                  line: Number(match[2]),
                  column: Number(match[3]),
                }),
            },
          ]
        })
        callback(found.length === 0 ? undefined : found)
      },
    })
    const data = terminal.onData((input) => callbacks.current.onData(input))
    const resize = terminal.onResize((size) =>
      callbacks.current.onResize({ cols: size.cols, rows: size.rows }),
    )
    const refit = () => {
      try {
        fit.fit()
      } catch {
        // Hidden (collapsed panel): nothing to fit.
      }
    }
    refit()
    const observer = new ResizeObserver(refit)
    observer.observe(host)
    terminalRef.current = terminal
    written.current = { generation: -1, total: 0 }
    callbacks.current.onOpen({ cols: terminal.cols, rows: terminal.rows })
    // Measure again once the web font has loaded.
    let disposed = false
    void document.fonts?.ready.then(() => {
      if (disposed) return
      terminal.options.fontFamily = monoFontFamily()
      refit()
    })
    return () => {
      disposed = true
      observer.disconnect()
      links.dispose()
      data.dispose()
      resize.dispose()
      terminal.dispose()
      terminalRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (terminalRef.current !== null) {
      terminalRef.current.options.theme = terminalTheme(dark)
    }
  }, [dark])

  React.useEffect(() => {
    const terminal = terminalRef.current
    if (terminal === null) return
    const done = written.current
    const delta = output.total - done.total
    if (
      output.generation !== done.generation ||
      delta < 0 ||
      delta > output.text.length
    ) {
      terminal.reset()
      terminal.write(output.text)
    } else if (delta > 0) {
      terminal.write(output.text.slice(output.text.length - delta))
    }
    written.current = { generation: output.generation, total: output.total }
  }, [output])

  return (
    <div
      ref={hostRef}
      data-testid="terminal"
      className={`min-h-0 flex-1 overflow-hidden px-3 py-2 ${className ?? ""}`}
    />
  )
}
