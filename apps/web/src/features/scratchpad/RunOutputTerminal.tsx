import { FitAddon } from "@xterm/addon-fit"
import { type ITheme, Terminal } from "@xterm/xterm"
import "@xterm/xterm/css/xterm.css"
import * as React from "react"
import type { RunOutput } from "./runs.ts"

/** A clickable `path:line:col` in the terminal. */
export interface TerminalLocation {
  readonly path: string
  readonly line: number
  readonly column: number
}

const LOCATION_PATTERN = /([\w./-]+\.(?:tsx?|mts|cts)):(\d+):(\d+)/g

const HIDE_CURSOR = "\u001b[?25l"

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
export const runOutputTheme = (dark: boolean): ITheme =>
  dark
    ? {
        ...ansi.dark,
        background: "#09090b",
        foreground: "#e4e4e7",
        cursor: "#09090b",
        selectionBackground: "#3f3f46",
      }
    : {
        ...ansi.light,
        background: "#ffffff",
        foreground: "#27272a",
        cursor: "#ffffff",
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

/**
 * A read-only xterm showing the latest Run's output. It writes only what is
 * new, and starts over when a new Run replaces the output.
 */
export function RunOutputTerminal({
  output,
  className,
  onOpenLocation,
}: {
  readonly output: RunOutput
  readonly className?: string | undefined
  /**
   * Makes `path:line:col` locations clickable. Leave it unset for program
   * output: stack-trace line numbers are unreliable inside WebContainer.
   */
  readonly onOpenLocation?: ((location: TerminalLocation) => void) | undefined
}) {
  const openLocation = React.useRef(onOpenLocation)
  openLocation.current = onOpenLocation
  const hostRef = React.useRef<HTMLDivElement>(null)
  const terminalRef = React.useRef<Terminal | null>(null)
  const written = React.useRef({ runId: -1, total: 0 })
  const dark = useIsDark()

  React.useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    const terminal = new Terminal({
      disableStdin: true,
      convertEol: true,
      cursorBlink: false,
      cursorInactiveStyle: "none",
      fontFamily: monoFontFamily(),
      // xterm's default, which the Playground's terminal uses.
      fontSize: 15,
      lineHeight: 1.4,
      scrollback: 5000,
      theme: runOutputTheme(isDarkNow()),
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(host)
    const links = terminal.registerLinkProvider({
      provideLinks(row, callback) {
        const open = openLocation.current
        const text = terminal.buffer.active
          .getLine(row - 1)
          ?.translateToString(true)
        if (open === undefined || text === undefined) return callback(undefined)
        const found = [...text.matchAll(LOCATION_PATTERN)].map((match) => ({
          text: match[0],
          range: {
            start: { x: match.index + 1, y: row },
            end: { x: match.index + match[0].length, y: row },
          },
          decorations: { pointerCursor: true, underline: true },
          activate: () =>
            openLocation.current?.({
              path: match[1]!,
              line: Number(match[2]),
              column: Number(match[3]),
            }),
        }))
        callback(found.length === 0 ? undefined : found)
      },
    })
    terminal.write(HIDE_CURSOR)
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
    written.current = { runId: -1, total: 0 }
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
      terminal.dispose()
      terminalRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (terminalRef.current !== null) {
      terminalRef.current.options.theme = runOutputTheme(dark)
    }
  }, [dark])

  React.useEffect(() => {
    const terminal = terminalRef.current
    if (terminal === null) return
    const done = written.current
    const delta = output.total - done.total
    if (
      output.runId !== done.runId ||
      delta < 0 ||
      delta > output.text.length
    ) {
      terminal.reset()
      // A report (locations clickable) reads from the top; program output
      // follows its tail.
      terminal.write(HIDE_CURSOR + output.text, () => {
        if (openLocation.current !== undefined) terminal.scrollToTop()
      })
    } else if (delta > 0) {
      terminal.write(output.text.slice(output.text.length - delta), () => {
        if (openLocation.current !== undefined) terminal.scrollToTop()
      })
    }
    written.current = { runId: output.runId, total: output.total }
  }, [output])

  return (
    <div
      ref={hostRef}
      data-testid="run-output-terminal"
      className={`min-h-0 flex-1 overflow-hidden px-3 py-2 ${className ?? ""}`}
    />
  )
}
