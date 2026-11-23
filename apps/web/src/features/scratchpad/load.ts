import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import { WorkspaceCompression } from "@/features/share/compression"
import {
  toFlatWorkspace,
  type FlatWorkspace,
  type FlatWorkspaceMetadata,
} from "@/features/share/flat"
import { ShortenClient } from "@/features/share/shorten/client"
import { normalizeScratchpadWorkspace } from "@/features/share/tsconfig"
import {
  EffectVersion,
  effectVersionForCodeLink,
  Workspace,
} from "@/features/share/workspace"
import { SCRATCHPAD_ENTRY_PATH } from "./config.ts"
import { SCRATCHPAD_SEED } from "./seed.ts"
import { makeMemoryWorkspace, type WorkspaceLimits } from "./workspace.ts"

/**
 * The Scratchpad's autosave key. It stores the same format as `/play`'s
 * `workspace-autosave` (`Option<Workspace>` as JSON) under its own key until
 * the cutover.
 */
export const SCRATCHPAD_AUTOSAVE_KEY = "scratchpad-autosave"

/** `/play`'s autosave key, read once when the Scratchpad has none of its own. */
export const PLAYGROUND_AUTOSAVE_KEY = "workspace-autosave"

export const PLAYGROUND_PATH = "/play"

/** Where a loaded Workspace came from, in load order. */
export type ScratchpadLoadSource =
  | "hash"
  | "code"
  | "autosave"
  | "playground-autosave"
  | "seed"

/** Why a legacy workspace opens in the Playground instead. */
export type LoadNoticeReason = "v3" | "limits"

/**
 * A workspace the Scratchpad found but can't open: an Effect v3 workspace or
 * one over the Workspace limits. The Scratchpad loads the seed and links to
 * the same source on `/play`.
 */
export interface LoadNotice {
  readonly reason: LoadNoticeReason
  readonly source: Exclude<ScratchpadLoadSource, "seed">
  readonly message: string
  readonly playgroundUrl: string
}

export interface LoadedScratchpadWorkspace {
  readonly source: ScratchpadLoadSource
  readonly files: Readonly<Record<string, string>>
  /**
   * The share format's non-file fields (name, `initialFilePath`, `prepare`,
   * `shells`, `snapshots`, per-node `userManaged`), kept so a Share can
   * rebuild the tree with `fromFlatWorkspace`.
   */
  readonly metadata: FlatWorkspaceMetadata | undefined
  /** The file opened first: the workspace's `initialFilePath` when it exists. */
  readonly initialFilePath: string
  readonly notice: Option.Option<LoadNotice>
}

/** The parts of `window.location` the loader reads. */
export interface ScratchpadLocation {
  /** `location.hash`, with or without the leading `#`. */
  readonly hash: string
  /** `location.search`, with or without the leading `?`. */
  readonly search: string
}

export interface LoadOptions {
  readonly limits?: WorkspaceLimits | undefined
}

type Candidate =
  | { readonly _tag: "Loaded"; readonly flat: FlatWorkspace }
  | { readonly _tag: "Rejected"; readonly notice: LoadNotice }

const AutosaveSchema = Schema.Option(Workspace)

const decodeCode = Schema.decodeUnknownOption(
  Schema.StringFromBase64Url.pipe(Schema.check(Schema.isNonEmpty())),
)
const decodeVersion = Schema.decodeUnknownOption(EffectVersion)

const stripPrefix = (value: string, prefix: string) =>
  value.startsWith(prefix) ? value.slice(prefix.length) : value

const optionalParam = (params: URLSearchParams, name: string) =>
  Option.fromNullishOr(params.get(name))

const sourceLabel: Record<LoadNotice["source"], string> = {
  hash: "This shared workspace",
  code: "This code link",
  autosave: "Your autosaved Scratchpad workspace",
  "playground-autosave": "Your autosaved Playground workspace",
}

const makeNotice = (
  source: LoadNotice["source"],
  reason: LoadNoticeReason,
  playgroundUrl: string,
  detail?: string,
): LoadNotice => ({
  source,
  reason,
  playgroundUrl,
  message:
    reason === "v3"
      ? `${sourceLabel[source]} uses Effect v3, which the Scratchpad doesn't support yet.`
      : `${sourceLabel[source]} doesn't fit the Scratchpad's limits${detail === undefined ? "." : `: ${detail}`}`,
})

/**
 * Checks a flat workspace against the in-memory Workspace's rules (path
 * validity, reserved folders, file count and size limits) by building one.
 */
const workspaceRejection = (
  files: Readonly<Record<string, string>>,
  limits: WorkspaceLimits | undefined,
) =>
  makeMemoryWorkspace({ initialFiles: files, limits }).pipe(
    Effect.as(Option.none<string>()),
    Effect.catch((error) => Effect.succeed(Option.some(error.message))),
  )

/**
 * Normalizes a share-format workspace for the Scratchpad and decides whether
 * it can load: v3 workspaces and ones over the limits become notices.
 */
const fromShareWorkspace = Effect.fnUntraced(function* (
  workspace: Workspace,
  source: LoadNotice["source"],
  playgroundUrl: string,
  options: LoadOptions,
) {
  if (workspace.effectVersion === "v3") {
    return {
      _tag: "Rejected",
      notice: makeNotice(source, "v3", playgroundUrl),
    } satisfies Candidate as Candidate
  }
  const flat = toFlatWorkspace(normalizeScratchpadWorkspace(workspace))
  const rejection = yield* workspaceRejection(flat.files, options.limits)
  if (Option.isSome(rejection)) {
    return {
      _tag: "Rejected",
      notice: makeNotice(source, "limits", playgroundUrl, rejection.value),
    } satisfies Candidate as Candidate
  }
  return { _tag: "Loaded", flat } satisfies Candidate as Candidate
})

/** `#<hash>`: a Share, retrieved from the shortener and decompressed. */
const fromHash = Effect.fnUntraced(function* (
  location: ScratchpadLocation,
  options: LoadOptions,
) {
  const hash = stripPrefix(location.hash, "#")
  if (hash === "") {
    return Option.none<Candidate>()
  }
  const client = yield* ShortenClient
  const compression = yield* WorkspaceCompression
  const compressed = yield* client
    .retrieve({ params: { hash } })
    .pipe(Effect.flatMap(Effect.fromOption))
  const workspace = yield* compression.decompress(compressed)
  return Option.some(
    yield* fromShareWorkspace(
      workspace,
      "hash",
      `${PLAYGROUND_PATH}#${hash}`,
      options,
    ),
  )
})

/**
 * `?code=<base64url>`: a single `src/main.ts` swapped into the seed. Like
 * `/play`, a link without `?version` is v3 (these links predate the version
 * toggle), so only `?version=v4` loads; v3 links get the notice and open on
 * `/play` with the same query.
 */
const fromCode = Effect.fnUntraced(function* (
  location: ScratchpadLocation,
  options: LoadOptions,
) {
  const search = stripPrefix(location.search, "?")
  const params = new URLSearchParams(search)
  const code = optionalParam(params, "code").pipe(Option.flatMap(decodeCode))
  if (Option.isNone(code)) {
    return Option.none<Candidate>()
  }
  const version = effectVersionForCodeLink(
    optionalParam(params, "version").pipe(Option.flatMap(decodeVersion)),
  )
  const playgroundUrl = `${PLAYGROUND_PATH}?${search}`
  if (version === "v3") {
    return Option.some<Candidate>({
      _tag: "Rejected",
      notice: makeNotice("code", "v3", playgroundUrl),
    })
  }
  const files = {
    ...SCRATCHPAD_SEED.files,
    [SCRATCHPAD_ENTRY_PATH]: code.value,
  }
  const rejection = yield* workspaceRejection(files, options.limits)
  if (Option.isSome(rejection)) {
    return Option.some<Candidate>({
      _tag: "Rejected",
      notice: makeNotice("code", "limits", playgroundUrl, rejection.value),
    })
  }
  return Option.some<Candidate>({
    _tag: "Loaded",
    flat: { ...SCRATCHPAD_SEED, files },
  })
})

/** An `Option<Workspace>` autosave in `/play`'s format, under `key`. */
const fromAutosave = Effect.fnUntraced(function* (
  key: string,
  source: "autosave" | "playground-autosave",
  options: LoadOptions,
) {
  const store = KeyValueStore.toSchemaStore(
    yield* KeyValueStore.KeyValueStore,
    AutosaveSchema,
  )
  const saved = Option.flatten(yield* store.get(key))
  if (Option.isNone(saved)) {
    return Option.none<Candidate>()
  }
  return Option.some(
    yield* fromShareWorkspace(saved.value, source, PLAYGROUND_PATH, options),
  )
})

/** Logs a failed source and treats it as absent, so loading falls through. */
const orNone =
  (source: ScratchpadLoadSource) =>
  <A, E, R>(effect: Effect.Effect<Option.Option<A>, E, R>) =>
    effect.pipe(
      Effect.catchCause((cause) =>
        Effect.logWarning(
          `Scratchpad: could not load the workspace from the ${source}; trying the next source`,
          cause,
        ).pipe(Effect.as(Option.none<A>())),
      ),
    )

const initialFilePathOf = (flat: FlatWorkspace): string => {
  const preferred = flat.metadata?.initialFilePath
  if (preferred !== undefined && flat.files[preferred] !== undefined) {
    return preferred
  }
  if (flat.files[SCRATCHPAD_ENTRY_PATH] !== undefined) {
    return SCRATCHPAD_ENTRY_PATH
  }
  return Object.keys(flat.files)[0] ?? SCRATCHPAD_ENTRY_PATH
}

const loaded = (
  source: ScratchpadLoadSource,
  flat: FlatWorkspace,
  notice: Option.Option<LoadNotice>,
): LoadedScratchpadWorkspace => ({
  source,
  files: flat.files,
  metadata: flat.metadata,
  initialFilePath: initialFilePathOf(flat),
  notice,
})

/**
 * Picks the Workspace the Scratchpad opens with, trying in order: the
 * `#<hash>` Share, a `?code=` link, the Scratchpad autosave, `/play`'s
 * autosave (only while the Scratchpad has none), then the seed.
 *
 * A source that fails (a corrupt hash, an unreachable shortener, an autosave
 * that doesn't decode) is logged and skipped. A source that is found but
 * can't open here (v3, over the limits) stops the search: the seed loads
 * with a notice linking to the same source on `/play`.
 */
export const loadScratchpadWorkspace = Effect.fnUntraced(function* (
  location: ScratchpadLocation,
  options: LoadOptions = {},
) {
  const sources: ReadonlyArray<
    readonly [
      ScratchpadLoadSource,
      Effect.Effect<
        Option.Option<Candidate>,
        unknown,
        ShortenClient | WorkspaceCompression | KeyValueStore.KeyValueStore
      >,
    ]
  > = [
    ["hash", fromHash(location, options)],
    ["code", fromCode(location, options)],
    ["autosave", fromAutosave(SCRATCHPAD_AUTOSAVE_KEY, "autosave", options)],
    [
      "playground-autosave",
      fromAutosave(PLAYGROUND_AUTOSAVE_KEY, "playground-autosave", options),
    ],
  ]
  for (const [source, load] of sources) {
    const candidate = yield* orNone(source)(load)
    if (Option.isNone(candidate)) {
      continue
    }
    if (candidate.value._tag === "Rejected") {
      yield* Effect.logInfo(
        `Scratchpad: the workspace from the ${source} can't open here (${candidate.value.notice.reason}); loading the seed`,
      )
      return loaded(
        "seed",
        SCRATCHPAD_SEED,
        Option.some(candidate.value.notice),
      )
    }
    yield* Effect.logInfo(`Scratchpad: loaded the workspace from the ${source}`)
    return loaded(source, candidate.value.flat, Option.none())
  }
  return loaded("seed", SCRATCHPAD_SEED, Option.none())
})
