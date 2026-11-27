/**
 * Quick fixes and refactors from the language server's `textDocument/codeAction`,
 * which `@codemirror/lsp-client` 6.3.1 has no UI for.
 *
 * - `diagnosticsWithCodeActions` renders pushed diagnostics like the client's
 *   own `serverDiagnostics`, then asks for the quick fixes of the whole
 *   document in one request and renders them again with the fixes as lint
 *   actions (buttons in the diagnostic tooltip). Put it before
 *   `languageServerExtensions()` so it handles the pushes, while
 *   `serverDiagnostics` still contributes its auto-sync.
 * - Ctrl/Cmd+. (`openCodeActionMenu`) lists every code action at the
 *   selection, refactors included, in a small menu.
 * - `applyWorkspaceEdit` applies an action's `WorkspaceEdit` through the
 *   client's workspace: the open editor gets a transaction, and other files go
 *   to the workspace's `updateFile` (in the Scratchpad, the Workspace store).
 */
import {
  type Action,
  type Diagnostic,
  linter,
  setDiagnostics,
} from "@codemirror/lint"
import {
  LSPPlugin,
  type LSPClient,
  type LSPClientExtension,
  type WorkspaceMapping,
} from "@codemirror/lsp-client"
import {
  type ChangeSpec,
  type EditorState,
  type Extension,
  Prec,
  StateEffect,
  StateField,
  type Text,
} from "@codemirror/state"
import {
  EditorView,
  hoverTooltip,
  keymap,
  showTooltip,
  type Tooltip,
  type TooltipView,
} from "@codemirror/view"
import {
  type CardDiagnostic,
  diagnosticCardTheme,
  renderDiagnosticCard,
} from "./diagnostic-card.ts"

export interface LspPosition {
  readonly line: number
  readonly character: number
}

export interface LspRange {
  readonly start: LspPosition
  readonly end: LspPosition
}

export interface LspDiagnostic {
  readonly range: LspRange
  readonly message: string
  readonly severity?: number | undefined
  readonly code?: number | string | undefined
  readonly source?: string | undefined
  readonly data?: unknown
}

export interface LspTextEdit {
  readonly range: LspRange
  readonly newText: string
}

export interface LspTextDocumentEdit {
  readonly textDocument: {
    readonly uri: string
    readonly version?: number | null
  }
  readonly edits: ReadonlyArray<LspTextEdit>
}

/** A `create`, `rename` or `delete` entry in `documentChanges`. */
export interface LspResourceOperation {
  readonly kind: "create" | "rename" | "delete"
}

export interface LspWorkspaceEdit {
  readonly changes?: Readonly<Record<string, ReadonlyArray<LspTextEdit>>>
  readonly documentChanges?: ReadonlyArray<
    LspTextDocumentEdit | LspResourceOperation
  >
}

export interface LspCommand {
  readonly title: string
  readonly command: string
  readonly arguments?: ReadonlyArray<unknown>
}

export interface LspCodeAction {
  readonly title: string
  readonly kind?: string
  readonly diagnostics?: ReadonlyArray<LspDiagnostic>
  readonly isPreferred?: boolean
  readonly disabled?: { readonly reason: string }
  readonly edit?: LspWorkspaceEdit
  readonly command?: LspCommand
  readonly data?: unknown
}

const CODE_ACTION_KINDS = [
  "",
  "quickfix",
  "refactor",
  "refactor.extract",
  "refactor.inline",
  "refactor.rewrite",
  "source",
  "source.organizeImports",
  "source.fixAll",
]

const codeActionCapabilities = {
  textDocument: {
    codeAction: {
      dynamicRegistration: false,
      isPreferredSupport: true,
      disabledSupport: true,
      dataSupport: true,
      resolveSupport: { properties: ["edit"] },
      codeActionLiteralSupport: {
        codeActionKind: { valueSet: CODE_ACTION_KINDS },
      },
    },
  },
}

const isTextDocumentEdit = (
  change: LspTextDocumentEdit | LspResourceOperation,
): change is LspTextDocumentEdit => "textDocument" in change

/**
 * The text edits of a `WorkspaceEdit` by document URI. `documentChanges` wins
 * over `changes` when both are present, as the protocol says. Resource
 * operations (create, rename, delete) are left out.
 */
export const workspaceEditTextEdits = (
  edit: LspWorkspaceEdit,
): ReadonlyMap<string, ReadonlyArray<LspTextEdit>> => {
  const byUri = new Map<string, Array<LspTextEdit>>()
  const add = (uri: string, edits: ReadonlyArray<LspTextEdit>) => {
    if (edits.length === 0) return
    const known = byUri.get(uri)
    if (known === undefined) byUri.set(uri, [...edits])
    else known.push(...edits)
  }
  if (edit.documentChanges !== undefined) {
    for (const change of edit.documentChanges) {
      if (isTextDocumentEdit(change)) add(change.textDocument.uri, change.edits)
    }
  } else if (edit.changes !== undefined) {
    for (const [uri, edits] of Object.entries(edit.changes)) add(uri, edits)
  }
  return byUri
}

const offsetOf = (doc: Text, pos: LspPosition): number => {
  if (pos.line >= doc.lines) return doc.length
  const line = doc.line(pos.line + 1)
  return Math.min(line.from + pos.character, line.to)
}

const positionOf = (doc: Text, offset: number): LspPosition => {
  const line = doc.lineAt(offset)
  return { line: line.number - 1, character: offset - line.from }
}

export interface AppliedWorkspaceEdit {
  /** Documents that were changed. */
  readonly applied: ReadonlyArray<string>
  /** Documents the client's workspace does not have, left unchanged. */
  readonly skipped: ReadonlyArray<string>
}

/**
 * Applies a `WorkspaceEdit` through `client.workspace.updateFile`. Positions
 * are mapped through `mapping` when it knows the document (create it before
 * the request that returned the edit, as `client.withMapping` does), and
 * otherwise read against the document as last synced.
 */
export const applyWorkspaceEdit = (
  client: LSPClient,
  edit: LspWorkspaceEdit,
  mapping?: WorkspaceMapping,
): AppliedWorkspaceEdit => {
  const applied: Array<string> = []
  const skipped: Array<string> = []
  for (const [uri, edits] of workspaceEditTextEdits(edit)) {
    const file = client.workspace.getFile(uri)
    if (file === null) {
      skipped.push(uri)
      continue
    }
    const known = mapping?.getMapping(uri) != null
    const map = (pos: LspPosition) =>
      known ? mapping!.mapPosition(uri, pos) : offsetOf(file.doc, pos)
    const changes: Array<ChangeSpec> = edits.map((textEdit) => {
      const from = map(textEdit.range.start)
      return {
        from,
        to: Math.max(from, map(textEdit.range.end)),
        insert: textEdit.newText,
      }
    })
    client.workspace.updateFile(uri, {
      changes,
      userEvent: "input.codeAction",
    })
    applied.push(uri)
  }
  return { applied, skipped }
}

// --- Diagnostics -----------------------------------------------------------

/** A pushed diagnostic, positioned in the current document. */
interface PlacedDiagnostic {
  readonly from: number
  readonly to: number
  readonly lsp: LspDiagnostic
  /** Its quick fixes, once the server has answered. */
  readonly fixes: ReadonlyArray<ActionRef>
}

const setPlacedDiagnostics =
  StateEffect.define<ReadonlyArray<PlacedDiagnostic>>()

/** The latest pushed LSP diagnostics, kept for code action requests. */
const placedDiagnosticsField = StateField.define<
  ReadonlyArray<PlacedDiagnostic>
>({
  create: () => [],
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setPlacedDiagnostics)) return effect.value
    }
    if (!tr.docChanged || value.length === 0) return value
    return value.map((placed) => ({
      ...placed,
      from: tr.changes.mapPos(placed.from, 1),
      to: tr.changes.mapPos(placed.to, -1),
    }))
  },
})

/** The LSP diagnostics overlapping `from`-`to` (touching counts). */
const diagnosticsAt = (
  state: EditorState,
  from: number,
  to: number,
): Array<LspDiagnostic> =>
  (state.field(placedDiagnosticsField, false) ?? [])
    .filter((placed) => placed.from <= to && placed.to >= from)
    .map((placed) => placed.lsp)

const severityOf = (severity: number | undefined): Diagnostic["severity"] => {
  switch (severity) {
    case 2:
      return "warning"
    case 3:
      return "info"
    case 4:
      return "hint"
    default:
      return "error"
  }
}

const sameDiagnostic = (a: LspDiagnostic, b: LspDiagnostic) =>
  a.message === b.message &&
  String(a.code) === String(b.code) &&
  a.range.start.line === b.range.start.line &&
  a.range.start.character === b.range.start.character &&
  a.range.end.line === b.range.end.line &&
  a.range.end.character === b.range.end.character

/** An action from the server, with the document version it was asked for. */
interface ActionRef {
  readonly action: LspCodeAction
  readonly uri: string
  readonly version: number
}

/** Actions without an edit we can apply, or that the server disabled, are left out. */
const isUsable = (action: LspCodeAction) =>
  action.disabled === undefined &&
  (action.edit !== undefined ||
    action.command !== undefined ||
    action.data !== undefined)

const requestCodeActions = (
  client: LSPClient,
  uri: string,
  range: LspRange,
  diagnostics: ReadonlyArray<LspDiagnostic>,
  extra: { readonly only?: ReadonlyArray<string>; readonly triggerKind: 1 | 2 },
): Promise<ReadonlyArray<LspCodeAction>> =>
  client
    .request<unknown, ReadonlyArray<LspCodeAction | LspCommand> | null>(
      "textDocument/codeAction",
      {
        textDocument: { uri },
        range,
        context: { diagnostics, ...extra },
      },
    )
    .then((result) =>
      (result ?? []).filter(
        (item): item is LspCodeAction =>
          typeof (item as LspCommand).command !== "string" &&
          isUsable(item as LspCodeAction),
      ),
    )

/** Whether the connected server answers `textDocument/codeAction`. */
const hasCodeActions = (client: LSPClient): boolean =>
  Boolean(client.serverCapabilities?.codeActionProvider)

/** A generation per view, so only the newest push's fixes are shown. */
const pushGeneration = new WeakMap<EditorView, number>()

const renderDiagnostics = (
  view: EditorView,
  plugin: LSPPlugin,
  uri: string,
  version: number,
  diagnostics: ReadonlyArray<LspDiagnostic>,
  fixes: ReadonlyArray<LspCodeAction>,
) => {
  const placed: Array<PlacedDiagnostic> = diagnostics.map((lsp) => ({
    from: plugin.unsyncedChanges.mapPos(
      plugin.fromPosition(lsp.range.start, plugin.syncedDoc),
    ),
    to: plugin.unsyncedChanges.mapPos(
      plugin.fromPosition(lsp.range.end, plugin.syncedDoc),
    ),
    lsp,
    fixes: fixes
      .filter((fix) => fix.diagnostics?.some((d) => sameDiagnostic(d, lsp)))
      .sort(
        (a, b) =>
          Number(b.isPreferred ?? false) - Number(a.isPreferred ?? false),
      )
      .map((action) => ({ action, uri, version })),
  }))
  // The lint panel (and its keyboard access) still uses lint actions; the
  // hover card renders the same fixes itself.
  const rendered: Array<Diagnostic> = placed.map(({ from, to, lsp, fixes }) => {
    const actions: Array<Action> = fixes.map((ref) => ({
      name: ref.action.title,
      apply: (target, actionFrom, actionTo) => {
        runCodeAction(target, ref, actionFrom, actionTo)
      },
    }))
    return {
      from,
      to,
      severity: severityOf(lsp.severity),
      message: lsp.message,
      ...(actions.length > 0 ? { actions } : {}),
    }
  })
  view.dispatch(setDiagnostics(view.state, rendered), {
    effects: setPlacedDiagnostics.of(placed),
  })
}

/**
 * A replacement for `serverDiagnostics`' push handler that adds the server's
 * quick fixes as lint actions. See the module comment.
 */
export const diagnosticsWithCodeActions = (
  options: DiagnosticsOptions = {},
): LSPClientExtension => ({
  clientCapabilities: codeActionCapabilities,
  notificationHandlers: {
    "textDocument/publishDiagnostics": (client, raw) => {
      const params = raw as {
        readonly uri: string
        readonly version?: number | null
        readonly diagnostics: ReadonlyArray<LspDiagnostic>
      }
      const file = client.workspace.getFile(params.uri)
      if (
        file === null ||
        (params.version != null && params.version !== file.version)
      ) {
        return false
      }
      const view = file.getView()
      const plugin = view === null ? null : LSPPlugin.get(view)
      if (view === null || plugin === null) return false

      const version = file.version
      const generation = (pushGeneration.get(view) ?? 0) + 1
      pushGeneration.set(view, generation)
      renderDiagnostics(
        view,
        plugin,
        params.uri,
        version,
        params.diagnostics,
        [],
      )

      if (params.diagnostics.length === 0 || !hasCodeActions(client)) {
        return true
      }
      const doc = plugin.syncedDoc
      requestCodeActions(
        client,
        params.uri,
        { start: { line: 0, character: 0 }, end: positionOf(doc, doc.length) },
        params.diagnostics,
        { only: ["quickfix"], triggerKind: 2 },
      ).then(
        (fixes) => {
          if (fixes.length === 0) return
          if (pushGeneration.get(view) !== generation) return
          const current = client.workspace.getFile(params.uri)
          const currentPlugin = LSPPlugin.get(view)
          if (
            current === null ||
            current.version !== version ||
            current.getView() !== view ||
            currentPlugin === null ||
            currentPlugin.uri !== params.uri
          ) {
            return
          }
          renderDiagnostics(
            view,
            currentPlugin,
            params.uri,
            version,
            params.diagnostics,
            fixes,
          )
        },
        () => {
          // No fixes: the diagnostics are already shown.
        },
      )
      return true
    },
  },
  editorExtension: [
    placedDiagnosticsField,
    codeActionMenu,
    diagnosticCard(options.docsVersion ?? (() => "v4")),
  ],
})

export interface DiagnosticsOptions {
  /** The Effect docs version to link to from Effect rule explanations. */
  readonly docsVersion?: (() => string) | undefined
}

// --- The hover card ----------------------------------------------------------

/** Whether `pos` (approached from `side`) is inside `from`-`to`, as lint decides. */
const covers = (from: number, to: number, pos: number, side: -1 | 1) =>
  pos >= from &&
  pos <= to &&
  (from === to || ((pos > from || side > 0) && (pos < to || side < 0)))

/**
 * Replaces lint's hover tooltip with the diagnostic card. Lint's tooltip is
 * turned off with a `tooltipFilter` that finds nothing: lint skips the
 * tooltip when the filter returns no list.
 */
const diagnosticCard = (docsVersion: () => string): Extension => [
  linter(null, {
    tooltipFilter: () => null as unknown as Array<Diagnostic>,
  }),
  hoverTooltip(
    (view, pos, side) => {
      const found = (
        view.state.field(placedDiagnosticsField, false) ?? []
      ).filter((placed) => covers(placed.from, placed.to, pos, side))
      if (found.length === 0) return null
      return {
        pos: Math.min(...found.map((placed) => placed.from)),
        end: Math.max(...found.map((placed) => placed.to)),
        above: true,
        create: (target) => ({
          dom: renderDiagnosticCard(
            found.map((placed) => cardDiagnostic(target, placed)),
            {
              docsHref: (path) => `/docs/${docsVersion()}/${path}/`,
            },
          ),
        }),
      }
    },
    { hideOnChange: true },
  ),
  diagnosticCardTheme,
]

const cardDiagnostic = (
  view: EditorView,
  placed: PlacedDiagnostic,
): CardDiagnostic => ({
  severity: severityOf(placed.lsp.severity),
  message: placed.lsp.message,
  code: placed.lsp.code,
  fixes: placed.fixes.map((ref) => ({
    title: ref.action.title,
    preferred: ref.action.isPreferred ?? false,
    apply: () => {
      // Where the diagnostic is now: the document may have changed.
      const current = (
        view.state.field(placedDiagnosticsField, false) ?? []
      ).find((candidate) => candidate.lsp === placed.lsp)
      const at = current ?? placed
      runCodeAction(view, ref, at.from, at.to)
    },
  })),
})

// --- Running an action -----------------------------------------------------

const resolveAction = async (
  client: LSPClient,
  action: LspCodeAction,
): Promise<LspCodeAction> => {
  if (action.edit !== undefined || action.data === undefined) return action
  const provider = client.serverCapabilities?.codeActionProvider
  const canResolve =
    typeof provider === "object" &&
    provider !== null &&
    (provider as { resolveProvider?: boolean }).resolveProvider === true
  if (!canResolve) return action
  return client.request<LspCodeAction, LspCodeAction>(
    "codeAction/resolve",
    action,
  )
}

/**
 * Applies a code action: resolves it if it has no edit yet, applies its
 * `WorkspaceEdit`, then runs its command. When the document changed since the
 * action was offered, the actions at `from`-`to` are asked for again and the
 * one with the same title is used.
 */
export const runCodeAction = (
  view: EditorView,
  ref: ActionRef,
  from: number,
  to: number,
): void => {
  const plugin = LSPPlugin.get(view)
  if (plugin === null) return
  const client = plugin.client
  client.sync()
  const file = client.workspace.getFile(ref.uri)
  const stale = file === null || file.version !== ref.version
  void client
    .withMapping(async (mapping) => {
      let action: LspCodeAction | undefined = ref.action
      if (stale) {
        if (plugin.uri !== ref.uri) return
        const fresh = await requestCodeActions(
          client,
          ref.uri,
          {
            start: plugin.toPosition(from),
            end: plugin.toPosition(to),
          },
          diagnosticsAt(view.state, from, to),
          { triggerKind: 1 },
        )
        action = fresh.find(
          (candidate) =>
            candidate.title === ref.action.title &&
            candidate.kind === ref.action.kind,
        )
        if (action === undefined) return
      }
      const resolved = await resolveAction(client, action)
      if (resolved.edit !== undefined) {
        applyWorkspaceEdit(client, resolved.edit, mapping)
      }
      if (resolved.command !== undefined) {
        await client.request("workspace/executeCommand", {
          command: resolved.command.command,
          arguments: resolved.command.arguments,
        })
      }
    })
    .catch((error: unknown) => plugin.reportError("Code action failed", error))
}

// --- Ctrl/Cmd+. menu -------------------------------------------------------

interface MenuState {
  readonly pos: number
  readonly from: number
  readonly to: number
  readonly refs: ReadonlyArray<ActionRef>
  readonly selected: number
}

const openMenu = StateEffect.define<MenuState>()
const moveMenu = StateEffect.define<number>()
const closeMenu = StateEffect.define<null>()

const menuField = StateField.define<MenuState | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(openMenu)) return effect.value
      if (effect.is(closeMenu)) return null
      if (effect.is(moveMenu) && value !== null && value.refs.length > 0) {
        const count = value.refs.length
        return {
          ...value,
          selected: (((value.selected + effect.value) % count) + count) % count,
        }
      }
    }
    if (value !== null && (tr.docChanged || tr.selection !== undefined)) {
      return null
    }
    return value
  },
  provide: (field) =>
    showTooltip.compute([field], (state) => {
      const menu = state.field(field)
      return menu === null ? null : menuTooltip(menu)
    }),
})

const pick = (view: EditorView, index: number) => {
  const menu = view.state.field(menuField, false)
  if (menu == null) return
  const ref = menu.refs[index]
  view.dispatch({ effects: closeMenu.of(null) })
  view.focus()
  if (ref !== undefined) runCodeAction(view, ref, menu.from, menu.to)
}

const menuTooltip = (menu: MenuState): Tooltip => ({
  pos: menu.pos,
  above: false,
  create: (view): TooltipView => {
    const dom = document.createElement("div")
    dom.className = "cm-codeActionMenu"
    const list = document.createElement("ul")
    list.setAttribute("role", "listbox")
    list.setAttribute("aria-label", "Code actions")
    dom.appendChild(list)
    const render = (state: MenuState) => {
      list.replaceChildren()
      if (state.refs.length === 0) {
        const empty = document.createElement("li")
        empty.className = "cm-codeActionMenu-empty"
        empty.textContent = "No code actions available"
        list.appendChild(empty)
        return
      }
      state.refs.forEach((ref, index) => {
        const item = document.createElement("li")
        item.setAttribute("role", "option")
        item.textContent = ref.action.title
        if (ref.action.kind !== undefined) item.dataset.kind = ref.action.kind
        if (index === state.selected) item.setAttribute("aria-selected", "true")
        item.addEventListener("mousedown", (event) => {
          event.preventDefault()
          pick(view, index)
        })
        list.appendChild(item)
      })
    }
    render(menu)
    return {
      dom,
      update: (update) => {
        const next = update.state.field(menuField, false)
        if (next != null) render(next)
      },
    }
  },
})

const kindRank = (kind: string | undefined) =>
  kind === undefined
    ? 2
    : kind.startsWith("quickfix")
      ? 0
      : kind.startsWith("refactor")
        ? 1
        : 2

/**
 * Asks for the code actions at the selection, refactors included, and shows
 * them in a menu. Bound to Ctrl/Cmd+. by `diagnosticsWithCodeActions`.
 */
export const openCodeActionMenu = (view: EditorView): boolean => {
  const plugin = LSPPlugin.get(view)
  if (plugin === null) return false
  const client = plugin.client
  if (!hasCodeActions(client)) return false
  client.sync()
  const file = client.workspace.getFile(plugin.uri)
  if (file === null) return false
  const { from, to } = view.state.selection.main
  const doc = view.state.doc
  const version = file.version
  requestCodeActions(
    client,
    plugin.uri,
    { start: plugin.toPosition(from), end: plugin.toPosition(to) },
    diagnosticsAt(view.state, from, to),
    { triggerKind: 1 },
  ).then(
    (actions) => {
      if (view.state.doc !== doc) return
      const refs = [...actions]
        .sort((a, b) => kindRank(a.kind) - kindRank(b.kind))
        .map((action) => ({ action, uri: plugin.uri, version }))
      view.dispatch({
        effects: openMenu.of({ pos: from, from, to, refs, selected: 0 }),
      })
    },
    (error: unknown) => plugin.reportError("Code actions failed", error),
  )
  return true
}

const whenMenuOpen =
  (run: (view: EditorView, menu: MenuState) => void) =>
  (view: EditorView): boolean => {
    const menu = view.state.field(menuField, false)
    if (menu == null) return false
    run(view, menu)
    return true
  }

const menuKeymap = Prec.highest(
  keymap.of([
    {
      key: "ArrowDown",
      run: whenMenuOpen((view) => view.dispatch({ effects: moveMenu.of(1) })),
    },
    {
      key: "ArrowUp",
      run: whenMenuOpen((view) => view.dispatch({ effects: moveMenu.of(-1) })),
    },
    {
      key: "Enter",
      run: whenMenuOpen((view, menu) => pick(view, menu.selected)),
    },
    {
      key: "Escape",
      run: whenMenuOpen((view) =>
        view.dispatch({ effects: closeMenu.of(null) }),
      ),
    },
  ]),
)

const ld = (light: string, dark: string) => `light-dark(${light}, ${dark})`

const menuTheme = EditorView.baseTheme({
  ".cm-tooltip .cm-codeActionMenu": {
    maxHeight: "16em",
    overflowY: "auto",
    "& > ul": {
      margin: "0",
      padding: "2px 0",
      listStyle: "none",
      fontFamily: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)",
      fontSize: "13px",
    },
    "& li": {
      padding: "3px 10px",
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    "& li[aria-selected]": {
      backgroundColor: ld("#e4e4e7", "#3f3f46"),
    },
    "& li.cm-codeActionMenu-empty": {
      cursor: "default",
      color: ld("#71717a", "#a1a1aa"),
    },
  },
})

/** The Ctrl/Cmd+. menu: its state, tooltip, keys and styles. */
const codeActionMenu: Extension = [
  menuField,
  menuKeymap,
  Prec.high(keymap.of([{ key: "Mod-.", run: openCodeActionMenu }])),
  menuTheme,
]
