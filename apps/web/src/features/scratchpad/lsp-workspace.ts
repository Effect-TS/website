import {
  LSPPlugin,
  Workspace as CMLSWorkspace,
  type LSPClient,
  type WorkspaceFile,
} from "@codemirror/lsp-client"
import {
  ChangeSet,
  type EditorState,
  Text,
  type TransactionSpec,
} from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import {
  pathToWorkspaceUri,
  WORKSPACE_ROOT_URI,
  workspaceUriToPath,
} from "./workspace.ts"

interface ManagedWorkspaceFile extends WorkspaceFile {
  view: EditorView | null
}

export interface MultiFileLspWorkspaceCallbacks {
  readonly rootUri?: string | undefined
  readonly onDisplayFile: (relPath: string) => Promise<EditorView | null>
  readonly onServerUpdateFile?: (
    relPath: string,
    update: TransactionSpec,
  ) => void
  readonly getEditorState?: (relPath: string) => EditorState | undefined
}

const languageIdForPath = (relPath: string): string =>
  relPath.endsWith(".tsx") ? "typescriptreact" : "typescript"

/**
 * Bridges a multi-file Scratchpad/Playground `Workspace` into
 * `@codemirror/lsp-client`'s `Workspace` abstraction.
 *
 * Unlike `@codemirror/lsp-client`'s default single-editor workspace:
 * - Every file in the workspace stays open in `this.files` and in the LSP
 *   server (`textDocument/didOpen`), regardless of which tab is mounted.
 * - Switching tabs calls `closeFile`/`openFile`, which only detaches/attaches
 *   the `EditorView` without sending `didClose` to the server.
 * - `didClose` is only sent when a file is deleted or renamed out of the
 *   workspace.
 * - `displayFile` handles cross-file `jumpToDefinition` for workspace files
 *   and returns `null` for `node_modules` / external URIs.
 */
export class MultiFileLspWorkspace extends CMLSWorkspace {
  readonly files: Array<ManagedWorkspaceFile> = []
  private readonly filesByUri = new Map<string, ManagedWorkspaceFile>()
  private readonly rootUri: string
  private readonly callbacks: MultiFileLspWorkspaceCallbacks

  constructor(client: LSPClient, callbacks: MultiFileLspWorkspaceCallbacks) {
    super(client)
    this.rootUri = callbacks.rootUri ?? WORKSPACE_ROOT_URI
    this.callbacks = callbacks
  }

  /**
   * Ensures a workspace file is tracked in `this.files` and opened in the LSP
   * server if connected. Used during initial seed, file creation, and renames.
   */
  upsertWorkspaceFile(relPath: string, content: string): void {
    const uri = pathToWorkspaceUri(relPath, this.rootUri)
    const existing = this.filesByUri.get(uri)
    const nextDoc = Text.of(content.split("\n"))

    if (existing !== undefined) {
      if (!existing.doc.eq(nextDoc)) {
        const prevDoc = existing.doc
        const changes = ChangeSet.of(
          [{ from: 0, to: prevDoc.length, insert: nextDoc }],
          prevDoc.length,
        )
        existing.version += 1
        existing.doc = nextDoc
        if (this.client.connected) {
          this.client.notification("textDocument/didChange", {
            textDocument: { uri, version: existing.version },
            contentChanges: [{ text: content }],
          })
        }
        void changes
      }
      return
    }

    const file: ManagedWorkspaceFile = {
      uri,
      languageId: languageIdForPath(relPath),
      version: 1,
      doc: nextDoc,
      view: null,
      getView() {
        return this.view
      },
    }
    this.files.push(file)
    this.filesByUri.set(uri, file)
    if (this.client.connected) {
      this.client.didOpen(file)
    }
  }

  /**
   * Removes a deleted or renamed file from `this.files` and notifies the LSP
   * server with `textDocument/didClose`.
   */
  removeWorkspaceFile(relPath: string): void {
    const uri = pathToWorkspaceUri(relPath, this.rootUri)
    const existing = this.filesByUri.get(uri)
    if (existing === undefined) {
      return
    }
    this.filesByUri.delete(uri)
    const idx = this.files.indexOf(existing)
    if (idx !== -1) {
      this.files.splice(idx, 1)
    }
    if (this.client.connected) {
      this.client.didClose(uri)
    }
  }

  /**
   * Replaces the full tracked file set (e.g. on workspace snapshot restore).
   */
  replaceAllWorkspaceFiles(
    entries: ReadonlyArray<{ readonly path: string; readonly content: string }>,
  ): void {
    const nextUris = new Set(
      entries.map((e) => pathToWorkspaceUri(e.path, this.rootUri)),
    )
    for (const file of [...this.files]) {
      if (!nextUris.has(file.uri)) {
        const rel = workspaceUriToPath(file.uri, this.rootUri)
        if (rel !== undefined) {
          this.removeWorkspaceFile(rel)
        }
      }
    }
    for (const entry of entries) {
      this.upsertWorkspaceFile(entry.path, entry.content)
    }
  }

  override syncFiles() {
    const updates: Array<{
      file: WorkspaceFile
      prevDoc: Text
      changes: ChangeSet
    }> = []

    for (const file of this.files) {
      const view = file.view
      if (view === null) continue
      const plugin = LSPPlugin.get(view)
      if (plugin === null || plugin.uri !== file.uri) continue
      if (plugin.unsyncedChanges.empty) continue

      const prevDoc = file.doc
      const changes = plugin.unsyncedChanges
      file.version += 1
      file.doc = view.state.doc
      plugin.clear()
      updates.push({ file, prevDoc, changes })
    }

    return updates
  }

  override openFile(uri: string, languageId: string, view: EditorView): void {
    const existing = this.filesByUri.get(uri)
    if (existing !== undefined) {
      existing.view = view
      existing.languageId = languageId
      const plugin = LSPPlugin.get(view)
      if (plugin !== null) {
        plugin.syncedDoc = view.state.doc
        plugin.clear()
      }
      // If the mounted state drifted from our tracked doc, sync it
      if (!existing.doc.eq(view.state.doc)) {
        existing.version += 1
        existing.doc = view.state.doc
        if (this.client.connected) {
          this.client.notification("textDocument/didChange", {
            textDocument: { uri, version: existing.version },
            contentChanges: [{ text: view.state.doc.toString() }],
          })
        }
      }
      return
    }

    const file: ManagedWorkspaceFile = {
      uri,
      languageId,
      version: 1,
      doc: view.state.doc,
      view,
      getView() {
        return this.view
      },
    }
    this.files.push(file)
    this.filesByUri.set(uri, file)
    if (this.client.connected) {
      this.client.didOpen(file)
    }
  }

  override closeFile(uri: string, view: EditorView): void {
    const existing = this.filesByUri.get(uri)
    if (existing === undefined) return
    // Flush any unsynced edits from this view before detaching it
    if (existing.view === view) {
      const plugin = LSPPlugin.get(view)
      if (
        plugin !== null &&
        plugin.uri === uri &&
        !plugin.unsyncedChanges.empty
      ) {
        this.client.sync()
      }
      existing.view = null
    }
    // Intentionally do NOT call client.didClose(uri): the file still exists in
    // the workspace and must stay open in tsrs for cross-file typechecking.
  }

  override updateFile(uri: string, update: TransactionSpec): void {
    const existing = this.filesByUri.get(uri)
    if (existing !== undefined && existing.view !== null) {
      existing.view.dispatch(update)
      return
    }
    const relPath = workspaceUriToPath(uri, this.rootUri)
    if (relPath !== undefined) {
      this.callbacks.onServerUpdateFile?.(relPath, update)
    }
  }

  override async displayFile(uri: string): Promise<EditorView | null> {
    const relPath = workspaceUriToPath(uri, this.rootUri)
    if (relPath === undefined) {
      // External / node_modules URI: out of scope for jump-to-definition
      return null
    }
    if (!this.filesByUri.has(uri)) {
      return null
    }
    return this.callbacks.onDisplayFile(relPath)
  }
}
