/**
 * The diagnostic hover card: what the editor shows when you hover a problem.
 *
 * One section per diagnostic under the pointer, errors first, with a count
 * header when there is more than one. A section has a title (the Effect
 * rule's name, or the severity), the message with quoted types set as code,
 * a short explanation for Effect rules (see `effect-rules.ts`), and the quick
 * fixes: the preferred one first, and the "disable" fixes folded into one
 * Ignore menu.
 */
import { EditorView } from "@codemirror/view"
import { ruleInfo, type RuleInfo } from "./effect-rules.ts"

export type CardSeverity = "error" | "warning" | "info" | "hint"

export interface CardFix {
  readonly title: string
  readonly preferred: boolean
  readonly apply: () => void
}

export interface CardDiagnostic {
  readonly severity: CardSeverity
  readonly message: string
  readonly code?: number | string | undefined
  readonly fixes: ReadonlyArray<CardFix>
}

export interface CardOptions {
  /** The docs URL for a path under `/docs/<version>/`. */
  readonly docsHref: (path: string) => string
  /** How to write Mod-. for this platform, e.g. "⌘ ." or "Ctrl ." */
  readonly codeActionKey: string
}

// --- Reading a diagnostic --------------------------------------------------

export interface ParsedMessage {
  /** The message without the trailing `effect(rule)` tag. */
  readonly text: string
  readonly rule: RuleInfo | undefined
  /** The chip: `effect · rule` or `TS2322`. */
  readonly label: string | undefined
}

const EFFECT_RULE_SUFFIX = /\s*effect\((\w+)\)\s*$/

export const parseMessage = (
  message: string,
  code: number | string | undefined,
): ParsedMessage => {
  const match = EFFECT_RULE_SUFFIX.exec(message)
  if (match !== null) {
    const name = match[1]!
    return {
      text: message.slice(0, match.index).trim(),
      rule: ruleInfo(name),
      label: `effect · ${name}`,
    }
  }
  return {
    text: message,
    rule: undefined,
    label:
      code === undefined || code === ""
        ? undefined
        : typeof code === "number" || /^\d+$/.test(code)
          ? `TS${code}`
          : String(code),
  }
}

/** Fixes that silence the diagnostic rather than fix the code. */
export const isIgnoreFix = (title: string): boolean =>
  /^Disable \S+ for (this line|(the )?entire file)$/i.test(title) ||
  /@ts-(ignore|expect-error|nocheck)/i.test(title) ||
  /^Ignore this error/i.test(title)

export interface GroupedFixes {
  readonly primary: CardFix | undefined
  readonly others: ReadonlyArray<CardFix>
  readonly ignores: ReadonlyArray<CardFix>
}

/** The preferred fix first, the other fixes, then the ignores. */
export const groupFixes = (fixes: ReadonlyArray<CardFix>): GroupedFixes => {
  const ignores = fixes.filter((fix) => isIgnoreFix(fix.title))
  const real = fixes.filter((fix) => !isIgnoreFix(fix.title))
  const primary = real.find((fix) => fix.preferred) ?? real[0]
  return {
    primary,
    others: real.filter((fix) => fix !== primary),
    ignores,
  }
}

const SEVERITY_RANK: Record<CardSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
  hint: 3,
}

const SEVERITY_WORD: Record<CardSeverity, [string, string]> = {
  error: ["Error", "errors"],
  warning: ["Warning", "warnings"],
  info: ["Info", "info"],
  hint: ["Hint", "hints"],
}

/** "1 error, 2 warnings" for the header over several diagnostics. */
export const countSummary = (
  diagnostics: ReadonlyArray<{ readonly severity: CardSeverity }>,
): Array<{ severity: CardSeverity; text: string }> =>
  (Object.keys(SEVERITY_RANK) as Array<CardSeverity>).flatMap((severity) => {
    const n = diagnostics.filter((d) => d.severity === severity).length
    if (n === 0) return []
    const [one, many] = SEVERITY_WORD[severity]
    return [{ severity, text: `${n} ${n === 1 ? one.toLowerCase() : many}` }]
  })

// --- Rendering -------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg"

// Lucide's circle-x, triangle-alert and info.
const ICON_PATHS: Record<CardSeverity, ReadonlyArray<string>> = {
  error: ["M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20", "m15 9-6 6", "m9 9 6 6"],
  warning: [
    "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
    "M12 9v4",
    "M12 17h.01",
  ],
  info: ["M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20", "M12 16v-4", "M12 8h.01"],
  hint: ["M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20", "M12 16v-4", "M12 8h.01"],
}

const icon = (severity: CardSeverity): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("class", `cm-diagnosticCard-icon is-${severity}`)
  for (const d of ICON_PATHS[severity]) {
    const path = document.createElementNS(SVG_NS, "path")
    path.setAttribute("d", d)
    svg.append(path)
  }
  return svg
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string | undefined,
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  node.append(...children)
  return node
}

/** Text with `pattern`'s first group set as inline code. */
const withCode = (text: string, pattern: RegExp): Array<Node | string> => {
  const parts: Array<Node | string> = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(last, match.index))
    parts.push(el("code", undefined, match[1]!))
    last = match.index + match[0].length
  }
  parts.push(text.slice(last))
  return parts.filter((part) => part !== "")
}

// TypeScript quotes types and names in single quotes: 'string'.
const QUOTED = /'([^'\n]{1,200})'/g
const BACKTICKED = /`([^`\n]+)`/g

const fixButton = (fix: CardFix, primary: boolean): HTMLButtonElement => {
  const button = el(
    "button",
    primary ? "cm-diagnosticCard-fix is-primary" : "cm-diagnosticCard-fix",
    ...withCode(fix.title, /(yield\*|@ts-\w+)/g),
  )
  button.type = "button"
  button.addEventListener("click", (event) => {
    event.preventDefault()
    fix.apply()
  })
  return button
}

/**
 * The Ignore button and its menu. The menu opens in the card's flow under the
 * buttons: the tooltip clips anything positioned outside it.
 */
const ignoreMenu = (
  ignores: ReadonlyArray<CardFix>,
): { readonly toggle: HTMLElement; readonly menu: HTMLElement } => {
  const toggle = el("button", "cm-diagnosticCard-fix", "Ignore")
  toggle.type = "button"
  toggle.setAttribute("aria-haspopup", "menu")
  toggle.setAttribute("aria-expanded", "false")
  const chevron = document.createElementNS(SVG_NS, "svg")
  chevron.setAttribute("viewBox", "0 0 24 24")
  chevron.setAttribute("aria-hidden", "true")
  chevron.setAttribute("class", "cm-diagnosticCard-chevron")
  const path = document.createElementNS(SVG_NS, "path")
  path.setAttribute("d", "m6 9 6 6 6-6")
  chevron.append(path)
  toggle.append(chevron)

  const menu = el("div", "cm-diagnosticCard-menu")
  menu.setAttribute("role", "menu")
  menu.hidden = true
  for (const fix of ignores) {
    const item = el(
      "button",
      undefined,
      fix.title.replace(/^Disable (\S+) for /i, "Disable for "),
    )
    item.type = "button"
    item.title = fix.title
    item.setAttribute("role", "menuitem")
    item.setAttribute("aria-label", fix.title)
    item.addEventListener("click", (event) => {
      event.preventDefault()
      fix.apply()
    })
    menu.append(item)
  }
  toggle.addEventListener("click", (event) => {
    event.preventDefault()
    menu.hidden = !menu.hidden
    toggle.setAttribute("aria-expanded", String(!menu.hidden))
  })
  return { toggle, menu }
}

const renderSection = (
  diagnostic: CardDiagnostic,
  options: CardOptions,
  single: boolean,
): HTMLElement => {
  const parsed = parseMessage(diagnostic.message, diagnostic.code)
  const section = el("div", `cm-diagnosticCard-item is-${diagnostic.severity}`)

  const title = parsed.rule?.title ?? SEVERITY_WORD[diagnostic.severity][0]
  const header = el(
    "div",
    "cm-diagnosticCard-header",
    icon(diagnostic.severity),
    el("span", "cm-diagnosticCard-title", title),
  )
  if (parsed.label !== undefined) {
    header.append(el("span", "cm-diagnosticCard-chip", parsed.label))
  }
  section.append(header)
  section.append(
    el("div", "cm-diagnosticCard-message", ...withCode(parsed.text, QUOTED)),
  )

  // Explanations only for a lone diagnostic: stacked cards stay short.
  if (single && parsed.rule?.why !== undefined) {
    const why = el(
      "div",
      "cm-diagnosticCard-why",
      ...withCode(parsed.rule.why, BACKTICKED),
    )
    if (parsed.rule.docs !== undefined) {
      const link = el(
        "a",
        "cm-diagnosticCard-docs",
        `Docs: ${parsed.rule.docs.label} ↗`,
      )
      link.href = options.docsHref(parsed.rule.docs.path)
      link.target = "_blank"
      link.rel = "noopener"
      why.append(" ", link)
    }
    section.append(why)
  }

  const { primary, others, ignores } = groupFixes(diagnostic.fixes)
  if (primary !== undefined || ignores.length > 0) {
    const footer = el("div", "cm-diagnosticCard-actions")
    if (primary !== undefined) footer.append(fixButton(primary, true))
    for (const fix of others.slice(0, 2)) footer.append(fixButton(fix, false))
    const ignore = ignores.length > 0 ? ignoreMenu(ignores) : undefined
    if (ignore !== undefined) footer.append(ignore.toggle)
    footer.append(
      el("span", "cm-diagnosticCard-spacer"),
      el(
        "span",
        "cm-diagnosticCard-hint",
        others.length > 2 ? "More fixes " : "All fixes ",
        el("kbd", undefined, options.codeActionKey),
      ),
    )
    section.append(footer)
    if (ignore !== undefined) section.append(ignore.menu)
  }
  return section
}

/** The card for the diagnostics under the pointer. */
export const renderDiagnosticCard = (
  diagnostics: ReadonlyArray<CardDiagnostic>,
  options: CardOptions,
): HTMLElement => {
  const sorted = [...diagnostics].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  )
  const card = el("div", "cm-tooltip-lint cm-diagnosticCard")
  if (sorted.length > 1) {
    const summary = el("div", "cm-diagnosticCard-summary")
    for (const { severity, text } of countSummary(sorted)) {
      summary.append(
        el(
          "span",
          `cm-diagnosticCard-count is-${severity}`,
          icon(severity),
          text,
        ),
      )
    }
    card.append(summary)
  }
  for (const diagnostic of sorted) {
    card.append(renderSection(diagnostic, options, sorted.length === 1))
  }
  return card
}

export const codeActionKeyLabel = (): string =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? "⌘ ."
    : "Ctrl ."

// --- Styles ----------------------------------------------------------------

const ld = (light: string, dark: string) => `light-dark(${light}, ${dark})`

const muted = ld("#71717a", "#a1a1aa")
const border = ld("#e4e4e7", "#2e2e33")
const raised = ld("#f4f4f5", "#1f1f24")
const severityColor: Record<CardSeverity, string> = {
  error: ld("#dc2626", "#f87171"),
  warning: ld("#d97706", "#fbbf24"),
  info: ld("#0284c7", "#38bdf8"),
  hint: muted,
}

export const diagnosticCardTheme = EditorView.baseTheme({
  ".cm-tooltip .cm-diagnosticCard": {
    margin: "0",
    padding: "0",
    width: "max-content",
    maxWidth: "min(520px, 80vw)",
    fontFamily: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)",
    fontSize: "13px",
    lineHeight: "1.5",
  },
  ".cm-diagnosticCard code": {
    fontFamily:
      "var(--font-jetbrains-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
    fontSize: "12px",
    padding: "0 3px",
    borderRadius: "3px",
    backgroundColor: raised,
  },
  ".cm-diagnosticCard-summary": {
    display: "flex",
    gap: "12px",
    padding: "6px 12px",
    fontSize: "12px",
    borderBottom: `1px solid ${border}`,
    backgroundColor: ld("#fafafa", "#111114"),
  },
  ".cm-diagnosticCard-count": {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  ".cm-diagnosticCard-item": {
    padding: "9px 12px 10px",
  },
  ".cm-diagnosticCard-item + .cm-diagnosticCard-item": {
    borderTop: `1px solid ${border}`,
  },
  ".cm-diagnosticCard-header": {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    marginBottom: "2px",
  },
  ".cm-diagnosticCard-icon": {
    width: "14px",
    height: "14px",
    flexShrink: "0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.25",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  ".cm-diagnosticCard-icon.is-error, .cm-diagnosticCard-count.is-error": {
    color: severityColor.error,
  },
  ".cm-diagnosticCard-icon.is-warning, .cm-diagnosticCard-count.is-warning": {
    color: severityColor.warning,
  },
  ".cm-diagnosticCard-icon.is-info, .cm-diagnosticCard-count.is-info": {
    color: severityColor.info,
  },
  ".cm-diagnosticCard-icon.is-hint, .cm-diagnosticCard-count.is-hint": {
    color: severityColor.hint,
  },
  ".cm-diagnosticCard-title": {
    fontWeight: "600",
  },
  ".cm-diagnosticCard-chip": {
    marginLeft: "auto",
    paddingLeft: "16px",
    fontFamily:
      "var(--font-jetbrains-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
    fontSize: "11px",
    color: muted,
    whiteSpace: "nowrap",
  },
  ".cm-diagnosticCard-message": {
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  ".cm-diagnosticCard-why": {
    marginTop: "8px",
    padding: "7px 10px",
    borderRadius: "6px",
    backgroundColor: raised,
    color: ld("#52525b", "#a1a1aa"),
    fontSize: "12.5px",
  },
  ".cm-diagnosticCard-why code": {
    backgroundColor: ld("#e4e4e7", "#2a2a30"),
  },
  ".cm-diagnosticCard-docs": {
    color: ld("#2563eb", "#93c5fd"),
    textDecoration: "none",
    whiteSpace: "nowrap",
    "&:hover": { textDecoration: "underline" },
  },
  ".cm-diagnosticCard-actions": {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "6px",
    marginTop: "10px",
  },
  ".cm-diagnosticCard-fix": {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    height: "26px",
    padding: "0 10px",
    borderRadius: "5px",
    border: `1px solid ${ld("#d4d4d8", "#3a3a40")}`,
    backgroundColor: ld("#ffffff", "#1b1b1f"),
    color: "inherit",
    font: "inherit",
    fontSize: "12.5px",
    cursor: "pointer",
    "&:hover": { backgroundColor: ld("#f4f4f5", "#26262b") },
  },
  ".cm-diagnosticCard-fix.is-primary": {
    backgroundColor: ld("#18181b", "#e4e4e7"),
    borderColor: ld("#18181b", "#e4e4e7"),
    color: ld("#fafafa", "#09090b"),
    fontWeight: "600",
    "&:hover": { backgroundColor: ld("#27272a", "#ffffff") },
  },
  ".cm-diagnosticCard-fix.is-primary code": {
    backgroundColor: "transparent",
    padding: "0",
    color: "inherit",
  },
  ".cm-diagnosticCard-chevron": {
    width: "13px",
    height: "13px",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
  },
  ".cm-diagnosticCard-menu": {
    display: "flex",
    flexDirection: "column",
    width: "fit-content",
    minWidth: "200px",
    marginTop: "6px",
    padding: "3px",
    borderRadius: "6px",
    border: `1px solid ${ld("#d4d4d8", "#3a3a40")}`,
    backgroundColor: ld("#ffffff", "#18181b"),
    "& button": {
      display: "block",
      width: "100%",
      textAlign: "left",
      padding: "4px 8px",
      border: "none",
      borderRadius: "4px",
      background: "none",
      color: "inherit",
      font: "inherit",
      fontSize: "12.5px",
      whiteSpace: "nowrap",
      cursor: "pointer",
    },
    "& button:hover, & button:focus-visible": {
      backgroundColor: ld("#f4f4f5", "#27272a"),
    },
  },
  ".cm-diagnosticCard-menu[hidden]": { display: "none" },
  ".cm-diagnosticCard-spacer": { flex: "1" },
  ".cm-diagnosticCard-hint": {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    color: muted,
    fontSize: "11.5px",
    whiteSpace: "nowrap",
    "& kbd": {
      fontFamily:
        "var(--font-jetbrains-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
      fontSize: "10.5px",
      padding: "0 4px",
      borderRadius: "4px",
      border: `1px solid ${ld("#d4d4d8", "#3a3a40")}`,
      borderBottomWidth: "2px",
    },
  },
})
