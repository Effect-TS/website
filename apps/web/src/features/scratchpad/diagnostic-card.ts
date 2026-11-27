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

const icon = (severity: CardSeverity): SVGSVGElement =>
  svgIcon(`cm-diagnosticCard-icon is-${severity}`, ICON_PATHS[severity])

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

const svgIcon = (className: string, paths: ReadonlyArray<string>) => {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("class", className)
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, "path")
    path.setAttribute("d", d)
    svg.append(path)
  }
  return svg
}

// Lucide's wrench and chevron-down.
const WRENCH = [
  "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
]
const CHEVRON = ["m6 9 6 6 6-6"]

/** "Disable floatingEffect for this line" → "Ignore on this line". */
export const ignoreLabel = (title: string): string =>
  /for this line$/i.test(title)
    ? "Ignore on this line"
    : /for (the )?entire file$/i.test(title)
      ? "Ignore in this file"
      : title

const menuItem = (
  fix: CardFix,
  label: Array<Node | string>,
  muted: boolean,
) => {
  const item = el(
    "button",
    muted
      ? "cm-diagnosticCard-menuItem is-muted"
      : "cm-diagnosticCard-menuItem",
    ...label,
  )
  item.type = "button"
  item.setAttribute("role", "menuitem")
  item.setAttribute("aria-label", fix.title)
  item.title = fix.title
  item.addEventListener("click", (event) => {
    event.preventDefault()
    fix.apply()
  })
  return item
}

/**
 * The Fix button and its menu: the fixes first (the preferred one on top),
 * then the ignores. The menu floats (`position: fixed`) next to the button
 * rather than sitting in the card's flow: a card above its line grows upward,
 * so a taller card would move the button out from under the pointer, or flip
 * the card below the line. Fixed positioning also escapes the tooltip's
 * `overflow: hidden`, and the menu stays inside the card's DOM, so the hover
 * still counts as over the card.
 */
const MENU_GAP = 4

const fixMenu = (
  fixes: ReadonlyArray<CardFix>,
): { readonly row: HTMLElement; readonly menu: HTMLElement } => {
  const { primary, others, ignores } = groupFixes(fixes)
  const real = primary === undefined ? others : [primary, ...others]

  const toggle = el(
    "button",
    "cm-diagnosticCard-fix",
    svgIcon("cm-diagnosticCard-buttonIcon", WRENCH),
    "Fix",
    el("span", "cm-diagnosticCard-divider"),
    svgIcon("cm-diagnosticCard-buttonIcon", CHEVRON),
  )
  toggle.type = "button"
  toggle.setAttribute("aria-haspopup", "menu")
  toggle.setAttribute("aria-expanded", "false")

  const menu = el("div", "cm-diagnosticCard-menu")
  menu.setAttribute("role", "menu")
  menu.setAttribute("aria-label", "Fixes")
  menu.hidden = true
  for (const fix of real) {
    menu.append(menuItem(fix, withCode(fix.title, /(yield\*|@ts-\w+)/g), false))
  }
  if (real.length > 0 && ignores.length > 0) {
    const separator = el("div", "cm-diagnosticCard-menuSeparator")
    separator.setAttribute("role", "separator")
    menu.append(separator)
  }
  for (const fix of ignores) {
    menu.append(menuItem(fix, [ignoreLabel(fix.title)], true))
  }

  const items = () => [
    ...menu.querySelectorAll<HTMLButtonElement>("[role=menuitem]"),
  ]
  // Under the button, or above it when there is no room below.
  const place = () => {
    // The card closed with the menu open: drop the listeners.
    if (!toggle.isConnected) return setOpen(false)
    const button = toggle.getBoundingClientRect()
    const height = menu.offsetHeight
    const below = button.bottom + MENU_GAP
    const fitsBelow = below + height <= window.innerHeight - MENU_GAP
    menu.style.left = `${button.left}px`
    menu.style.top = `${
      fitsBelow ? below : Math.max(MENU_GAP, button.top - MENU_GAP - height)
    }px`
  }
  const setOpen = (open: boolean) => {
    menu.hidden = !open
    toggle.setAttribute("aria-expanded", String(open))
    if (open) {
      place()
      // The card moves with the editor's scroll, so the menu follows it.
      window.addEventListener("scroll", place, { capture: true, passive: true })
      window.addEventListener("resize", place, { passive: true })
      items()[0]?.focus()
    } else {
      window.removeEventListener("scroll", place, { capture: true })
      window.removeEventListener("resize", place)
    }
  }
  toggle.addEventListener("click", (event) => {
    event.preventDefault()
    setOpen(toggle.getAttribute("aria-expanded") !== "true")
  })
  menu.addEventListener("keydown", (event) => {
    const list = items()
    const index = list.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      list[(index + step + list.length) % list.length]?.focus()
    } else if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
      toggle.focus()
    }
  })

  const row = el("div", "cm-diagnosticCard-actions", toggle)
  return { row, menu }
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
      why.append(link)
    }
    section.append(why)
  }

  if (diagnostic.fixes.length > 0) {
    const { row, menu } = fixMenu(diagnostic.fixes)
    section.append(row, menu)
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
    // Fills the hover tooltip, so it lines up with a type's docs under it.
    // The tooltip itself caps the width.
    width: "auto",
    minWidth: "min(460px, 80vw)",
    fontFamily: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)",
    fontSize: "14px",
    lineHeight: "1.55",
  },
  ".cm-diagnosticCard code": {
    fontFamily:
      "var(--font-jetbrains-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
    fontSize: "12.5px",
    padding: "1px 4px",
    borderRadius: "4px",
    backgroundColor: raised,
  },
  ".cm-diagnosticCard-summary": {
    display: "flex",
    gap: "12px",
    padding: "8px 14px",
    fontSize: "13px",
    borderBottom: `1px solid ${border}`,
    backgroundColor: ld("#fafafa", "#111114"),
  },
  ".cm-diagnosticCard-count": {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  ".cm-diagnosticCard-item": {
    padding: "12px 14px 14px",
  },
  ".cm-diagnosticCard-item + .cm-diagnosticCard-item": {
    borderTop: `1px solid ${border}`,
  },
  ".cm-diagnosticCard-header": {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  ".cm-diagnosticCard-icon": {
    width: "16px",
    height: "16px",
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
    fontSize: "14.5px",
  },
  ".cm-diagnosticCard-chip": {
    marginLeft: "auto",
    paddingLeft: "20px",
    fontFamily:
      "var(--font-jetbrains-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
    fontSize: "12px",
    color: muted,
    whiteSpace: "nowrap",
  },
  ".cm-diagnosticCard-message": {
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  ".cm-diagnosticCard-why": {
    marginTop: "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    backgroundColor: raised,
    color: ld("#3f3f46", "#c4c4cc"),
    fontSize: "13.5px",
    lineHeight: "1.6",
  },
  ".cm-diagnosticCard-why code": {
    backgroundColor: ld("#e4e4e7", "#2a2a30"),
  },
  ".cm-diagnosticCard-docs": {
    color: ld("#2563eb", "#93c5fd"),
    textDecoration: "none",
    whiteSpace: "nowrap",
    display: "block",
    width: "fit-content",
    marginTop: "6px",
    "&:hover": { textDecoration: "underline" },
  },
  ".cm-diagnosticCard-actions": {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
    marginTop: "14px",
  },
  ".cm-diagnosticCard-fix": {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    height: "30px",
    padding: "0 8px 0 10px",
    borderRadius: "6px",
    border: `1px solid ${ld("#d4d4d8", "#3a3a40")}`,
    backgroundColor: ld("#ffffff", "#1b1b1f"),
    color: "inherit",
    font: "inherit",
    fontSize: "13.5px",
    cursor: "pointer",
    "&:hover": { backgroundColor: ld("#f4f4f5", "#26262b") },
  },
  ".cm-diagnosticCard-buttonIcon": {
    width: "14px",
    height: "14px",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  ".cm-diagnosticCard-fix[aria-expanded=true]": {
    backgroundColor: ld("#f4f4f5", "#26262b"),
  },
  ".cm-diagnosticCard-divider": {
    width: "1px",
    height: "16px",
    margin: "0 2px 0 6px",
    backgroundColor: ld("#d4d4d8", "#3a3a40"),
  },
  ".cm-diagnosticCard-menu": {
    position: "fixed",
    zIndex: "1",
    display: "flex",
    flexDirection: "column",
    width: "max-content",
    minWidth: "260px",
    maxWidth: "min(420px, 90vw)",
    padding: "3px",
    boxShadow: `0 8px 24px ${ld("#18181b26", "#00000080")}`,
    borderRadius: "6px",
    border: `1px solid ${ld("#d4d4d8", "#3a3a40")}`,
    backgroundColor: ld("#ffffff", "#18181b"),
    "& .cm-diagnosticCard-menuItem": {
      display: "block",
      width: "100%",
      textAlign: "left",
      padding: "6px 10px",
      border: "none",
      borderRadius: "4px",
      background: "none",
      color: "inherit",
      font: "inherit",
      fontSize: "13.5px",
      whiteSpace: "nowrap",
      cursor: "pointer",
    },
    "& .cm-diagnosticCard-menuItem:hover, & .cm-diagnosticCard-menuItem:focus-visible":
      {
        backgroundColor: ld("#f4f4f5", "#27272a"),
        outline: "none",
      },
    "& .cm-diagnosticCard-menuItem.is-muted": { color: muted },
    "& .cm-diagnosticCard-menuSeparator": {
      height: "1px",
      margin: "3px 0",
      backgroundColor: border,
    },
  },
  ".cm-diagnosticCard-menu[hidden]": { display: "none" },
})
