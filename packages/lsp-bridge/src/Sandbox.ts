import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as path from "node:path"
import { pathToFileURL } from "node:url"

export const MAX_MESSAGE_BYTES = 256 * 1024
export const VIRTUAL_WORKSPACE_DIR = "/workspace"
export const VIRTUAL_WORKSPACE_URI = "file:///workspace"
export const VIRTUAL_MAIN_URI = "file:///workspace/main.ts"

export class PolicyViolationError extends Data.TaggedError(
  "PolicyViolationError",
)<{
  readonly reason: string
}> {}

export class MessageTooBigError extends Data.TaggedError("MessageTooBigError")<{
  readonly reason: string
  readonly bytes: number
  readonly limit: number
}> {}

const EDITABLE_METHODS = new Set([
  "textDocument/didOpen",
  "textDocument/didChange",
  "textDocument/didClose",
  "textDocument/didSave",
  "textDocument/willSave",
  "textDocument/willSaveWaitUntil",
  "textDocument/rename",
  "textDocument/prepareRename",
  "textDocument/formatting",
  "textDocument/rangeFormatting",
  "textDocument/onTypeFormatting",
  "workspace/applyEdit",
  "workspace/didChangeWatchedFiles",
  "workspace/didCreateFiles",
  "workspace/didRenameFiles",
  "workspace/didDeleteFiles",
])

export interface SessionMessageValidator {
  readonly validateAndRewriteClientMessage: (
    raw: string,
  ) => Effect.Effect<string, PolicyViolationError | MessageTooBigError>
}

export interface WorkspaceSandbox {
  readonly workspaceDir: string
  readonly workspaceRootUri: string
  readonly mainFilePath: string
  readonly mainFileUri: string
  readonly maxMessageBytes: number
  readonly makeSessionValidator: () => SessionMessageValidator
  readonly rewriteServerMessage: (raw: string) => string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

interface LspPosition {
  readonly line: number
  readonly character: number
}

interface LspRange {
  readonly start: LspPosition
  readonly end: LspPosition
}

const positionToOffset = (text: string, pos: LspPosition): number => {
  let line = 0
  let offset = 0
  while (line < pos.line && offset < text.length) {
    const nl = text.indexOf("\n", offset)
    if (nl === -1) {
      return text.length
    }
    offset = nl + 1
    line += 1
  }
  return Math.min(offset + Math.max(0, pos.character), text.length)
}

const isLspPosition = (value: unknown): value is LspPosition =>
  isRecord(value) &&
  typeof value.line === "number" &&
  typeof value.character === "number"

const isLspRange = (value: unknown): value is LspRange =>
  isRecord(value) && isLspPosition(value.start) && isLspPosition(value.end)

const applyContentChanges = (
  current: string,
  changes: ReadonlyArray<unknown>,
): string => {
  let text = current
  for (const change of changes) {
    if (!isRecord(change) || typeof change.text !== "string") {
      continue
    }
    if (isLspRange(change.range)) {
      const startOffset = positionToOffset(text, change.range.start)
      const endOffset = positionToOffset(text, change.range.end)
      text =
        text.slice(0, startOffset) +
        change.text +
        text.slice(Math.max(startOffset, endOffset))
    } else {
      text = change.text
    }
  }
  return text
}

export const createWorkspaceSandbox = (
  workspaceDir: string,
  maxMessageBytes: number = MAX_MESSAGE_BYTES,
): WorkspaceSandbox => {
  const resolvedRoot = path.resolve(workspaceDir)
  const resolvedRootPosix = resolvedRoot.split(path.sep).join("/")
  const workspaceRootUri = pathToFileURL(resolvedRoot).href.replace(/\/$/, "")
  const mainFilePath = path.join(resolvedRoot, "main.ts")
  const mainFileUri = pathToFileURL(mainFilePath).href

  const validateAndRewriteUri = (
    rawUri: unknown,
    mode: "editable" | "readonly" | "root",
  ): Effect.Effect<string, PolicyViolationError> =>
    Effect.suspend(() => {
      if (typeof rawUri !== "string" || rawUri.length === 0) {
        return Effect.fail(
          new PolicyViolationError({ reason: "Document URI must be a string" }),
        )
      }

      let url: URL
      try {
        url = new URL(rawUri)
      } catch {
        return Effect.fail(
          new PolicyViolationError({ reason: `Invalid URI: ${rawUri}` }),
        )
      }

      if (url.protocol !== "file:") {
        return Effect.fail(
          new PolicyViolationError({
            reason: `Disallowed URI scheme: ${url.protocol}`,
          }),
        )
      }

      let decodedPathname: string
      try {
        decodedPathname = decodeURIComponent(url.pathname)
      } catch {
        return Effect.fail(
          new PolicyViolationError({
            reason: `Invalid percent-encoding in URI: ${rawUri}`,
          }),
        )
      }

      if (decodedPathname.includes("\0")) {
        return Effect.fail(
          new PolicyViolationError({
            reason: "Null byte disallowed in document URI",
          }),
        )
      }

      const normalized = path.posix.normalize(decodedPathname)

      let mappedPath: string | undefined
      if (normalized === VIRTUAL_WORKSPACE_DIR) {
        mappedPath = resolvedRoot
      } else if (normalized.startsWith(`${VIRTUAL_WORKSPACE_DIR}/`)) {
        const rel = normalized.slice(VIRTUAL_WORKSPACE_DIR.length + 1)
        mappedPath = path.resolve(resolvedRoot, rel)
      } else if (normalized === resolvedRootPosix) {
        mappedPath = resolvedRoot
      } else if (normalized.startsWith(`${resolvedRootPosix}/`)) {
        const rel = normalized.slice(resolvedRootPosix.length + 1)
        mappedPath = path.resolve(resolvedRoot, rel)
      }

      if (
        mappedPath === undefined ||
        (mappedPath !== resolvedRoot &&
          !mappedPath.startsWith(`${resolvedRoot}${path.sep}`))
      ) {
        return Effect.fail(
          new PolicyViolationError({
            reason: `URI outside workspace sandbox: ${rawUri}`,
          }),
        )
      }

      if (mode === "editable" && mappedPath !== mainFilePath) {
        return Effect.fail(
          new PolicyViolationError({
            reason: `Editable URI restricted to ${VIRTUAL_MAIN_URI}: ${rawUri}`,
          }),
        )
      }

      return Effect.succeed(pathToFileURL(mappedPath).href.replace(/\/$/, ""))
    })

  const makeSessionValidator = (): SessionMessageValidator => {
    const openDocuments = new Map<string, string>()

    const checkBytes = (
      text: string,
      label: string,
    ): Effect.Effect<void, MessageTooBigError> =>
      Effect.suspend(() => {
        const bytes = Buffer.byteLength(text, "utf8")
        if (bytes > maxMessageBytes) {
          return Effect.fail(
            new MessageTooBigError({
              reason: `${label} exceeded ${maxMessageBytes} bytes (${bytes} bytes)`,
              bytes,
              limit: maxMessageBytes,
            }),
          )
        }
        return Effect.void
      })

    const validateAndRewriteClientMessage = (
      raw: string,
    ): Effect.Effect<string, PolicyViolationError | MessageTooBigError> =>
      Effect.gen(function* () {
        yield* checkBytes(raw, "Incoming WebSocket frame")

        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          return yield* Effect.fail(
            new PolicyViolationError({ reason: "Malformed JSON-RPC message" }),
          )
        }

        if (!isRecord(parsed)) {
          return yield* Effect.fail(
            new PolicyViolationError({
              reason: "JSON-RPC payload must be an object",
            }),
          )
        }

        const method =
          typeof parsed.method === "string" ? parsed.method : undefined
        const params = isRecord(parsed.params)
          ? { ...parsed.params }
          : undefined

        if (params === undefined) {
          return raw
        }

        let mutated = false

        if (method === "initialize") {
          if (params.rootUri !== undefined && params.rootUri !== null) {
            params.rootUri = yield* validateAndRewriteUri(
              params.rootUri,
              "root",
            )
            mutated = true
          }
          if (params.rootPath !== undefined && params.rootPath !== null) {
            if (typeof params.rootPath !== "string") {
              return yield* Effect.fail(
                new PolicyViolationError({ reason: "Invalid rootPath" }),
              )
            }
            const rewritten = yield* validateAndRewriteUri(
              pathToFileURL(params.rootPath).href,
              "root",
            )
            params.rootPath = new URL(rewritten).pathname
            mutated = true
          }
          if (Array.isArray(params.workspaceFolders)) {
            const rewrittenFolders: Array<unknown> = []
            for (const folder of params.workspaceFolders) {
              if (!isRecord(folder)) {
                return yield* Effect.fail(
                  new PolicyViolationError({
                    reason: "Invalid workspaceFolder",
                  }),
                )
              }
              const uri = yield* validateAndRewriteUri(folder.uri, "root")
              rewrittenFolders.push({ ...folder, uri })
            }
            params.workspaceFolders = rewrittenFolders
            mutated = true
          }
        } else {
          const uriMode =
            method !== undefined && EDITABLE_METHODS.has(method)
              ? "editable"
              : "readonly"

          if (isRecord(params.textDocument) && "uri" in params.textDocument) {
            const textDocument = params.textDocument
            const rewrittenUri = yield* validateAndRewriteUri(
              textDocument.uri,
              uriMode,
            )
            params.textDocument = {
              ...textDocument,
              uri: rewrittenUri,
            }
            mutated = true

            if (
              method === "textDocument/didOpen" &&
              typeof textDocument.text === "string"
            ) {
              yield* checkBytes(textDocument.text, "Open document text")
              openDocuments.set(rewrittenUri, textDocument.text)
            } else if (
              method === "textDocument/didChange" &&
              Array.isArray(params.contentChanges)
            ) {
              const previous = openDocuments.get(rewrittenUri) ?? ""
              const updated = applyContentChanges(
                previous,
                params.contentChanges,
              )
              yield* checkBytes(updated, "Open document text")
              openDocuments.set(rewrittenUri, updated)
            } else if (method === "textDocument/didClose") {
              openDocuments.delete(rewrittenUri)
            }
          }

          if ("uri" in params && params.uri !== undefined) {
            params.uri = yield* validateAndRewriteUri(params.uri, uriMode)
            mutated = true
          }

          if (Array.isArray(params.changes)) {
            const rewrittenChanges: Array<unknown> = []
            for (const change of params.changes) {
              if (isRecord(change) && "uri" in change) {
                const rewrittenUri = yield* validateAndRewriteUri(
                  change.uri,
                  uriMode,
                )
                rewrittenChanges.push({ ...change, uri: rewrittenUri })
              } else {
                rewrittenChanges.push(change)
              }
            }
            params.changes = rewrittenChanges
            mutated = true
          }

          if (isRecord(params.edit)) {
            const edit = { ...params.edit }
            let editMutated = false

            if (isRecord(edit.changes)) {
              const rewrittenEditChanges: Record<string, unknown> = {}
              for (const [uri, edits] of Object.entries(edit.changes)) {
                const rewrittenUri = yield* validateAndRewriteUri(uri, uriMode)
                rewrittenEditChanges[rewrittenUri] = edits
              }
              edit.changes = rewrittenEditChanges
              editMutated = true
            }

            if (Array.isArray(edit.documentChanges)) {
              const rewrittenDocChanges: Array<unknown> = []
              for (const change of edit.documentChanges) {
                if (!isRecord(change)) {
                  rewrittenDocChanges.push(change)
                  continue
                }
                const nextChange: Record<string, unknown> = { ...change }
                if (
                  isRecord(change.textDocument) &&
                  "uri" in change.textDocument
                ) {
                  nextChange.textDocument = {
                    ...change.textDocument,
                    uri: yield* validateAndRewriteUri(
                      change.textDocument.uri,
                      uriMode,
                    ),
                  }
                }
                if ("uri" in change && change.uri !== undefined) {
                  nextChange.uri = yield* validateAndRewriteUri(
                    change.uri,
                    uriMode,
                  )
                }
                if ("oldUri" in change && change.oldUri !== undefined) {
                  nextChange.oldUri = yield* validateAndRewriteUri(
                    change.oldUri,
                    uriMode,
                  )
                }
                if ("newUri" in change && change.newUri !== undefined) {
                  nextChange.newUri = yield* validateAndRewriteUri(
                    change.newUri,
                    uriMode,
                  )
                }
                rewrittenDocChanges.push(nextChange)
              }
              edit.documentChanges = rewrittenDocChanges
              editMutated = true
            }

            if (editMutated) {
              params.edit = edit
              mutated = true
            }
          }

          if (Array.isArray(params.files)) {
            const rewrittenFiles: Array<unknown> = []
            for (const file of params.files) {
              if (!isRecord(file)) {
                rewrittenFiles.push(file)
                continue
              }
              const nextFile: Record<string, unknown> = { ...file }
              if ("uri" in file && file.uri !== undefined) {
                nextFile.uri = yield* validateAndRewriteUri(file.uri, uriMode)
              }
              if ("oldUri" in file && file.oldUri !== undefined) {
                nextFile.oldUri = yield* validateAndRewriteUri(
                  file.oldUri,
                  uriMode,
                )
              }
              if ("newUri" in file && file.newUri !== undefined) {
                nextFile.newUri = yield* validateAndRewriteUri(
                  file.newUri,
                  uriMode,
                )
              }
              rewrittenFiles.push(nextFile)
            }
            params.files = rewrittenFiles
            mutated = true
          }
        }

        if (!mutated) {
          return raw
        }

        return JSON.stringify({ ...parsed, params })
      })

    return { validateAndRewriteClientMessage }
  }

  const rewriteValueOutbound = (value: unknown): unknown => {
    if (typeof value === "string") {
      if (value === workspaceRootUri) {
        return VIRTUAL_WORKSPACE_URI
      }
      if (value.startsWith(`${workspaceRootUri}/`)) {
        return `${VIRTUAL_WORKSPACE_URI}${value.slice(workspaceRootUri.length)}`
      }
      return value
    }
    if (Array.isArray(value)) {
      return value.map(rewriteValueOutbound)
    }
    if (isRecord(value)) {
      const out: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value)) {
        out[key] = rewriteValueOutbound(val)
      }
      return out
    }
    return value
  }

  const rewriteServerMessage = (raw: string): string => {
    if (workspaceRootUri === VIRTUAL_WORKSPACE_URI) {
      return raw
    }
    if (!raw.includes(workspaceRootUri)) {
      return raw
    }
    try {
      const parsed: unknown = JSON.parse(raw)
      return JSON.stringify(rewriteValueOutbound(parsed))
    } catch {
      return raw
    }
  }

  return {
    workspaceDir: resolvedRoot,
    workspaceRootUri,
    mainFilePath,
    mainFileUri,
    maxMessageBytes,
    makeSessionValidator,
    rewriteServerMessage,
  }
}
