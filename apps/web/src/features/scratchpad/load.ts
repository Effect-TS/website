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
import { effectVersionOfFiles, scratchpadSeed } from "./seed.ts"
import { readEffectVersionPreference } from "./version.ts"
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
export type LoadNoticeReason = "limits"

/**
 * A workspace the Scratchpad found but can't open: one over the Workspace
 * limits. The Scratchpad loads the seed and links to the same source on
 * `/play`.
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
  /** The Effect version the loaded files target, for the version toggle. */
  readonly effectVersion: EffectVersion
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

const limitsNotice = (
  source: LoadNotice["source"],
  playgroundUrl: string,
  detail: string,
): LoadNotice => ({
  source,
  reason: "limits",
  playgroundUrl,
  message: `${sourceLabel[source]} doesn't fit the Scratchpad's limits: ${detail}`,
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
 * it can load: one over the limits becomes a notice. v3 and v4 both load;
 * the version comes from its `package.json`.
 */
const fromShareWorkspace = Effect.fnUntraced(function* (
  workspace: Workspace,
  source: LoadNotice["source"],
  playgroundUrl: string,
  options: LoadOptions,
) {
  const flat = toFlatWorkspace(normalizeScratchpadWorkspace(workspace))
  const rejection = yield* workspaceRejection(flat.files, options.limits)
  if (Option.isSome(rejection)) {
    return {
      _tag: "Rejected",
      notice: limitsNotice(source, playgroundUrl, rejection.value),
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
 * `?code=<base64url>`: a single `src/main.ts` swapped into the seed for the
 * link's `?version`. Like `/play`, a link without one is v3: these links
 * predate the version toggle.
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
  const seed = scratchpadSeed(version)
  const files = {
    ...seed.files,
    [SCRATCHPAD_ENTRY_PATH]: code.value,
  }
  const rejection = yield* workspaceRejection(files, options.limits)
  if (Option.isSome(rejection)) {
    return Option.some<Candidate>({
      _tag: "Rejected",
      notice: limitsNotice("code", playgroundUrl, rejection.value),
    })
  }
  return Option.some<Candidate>({
    _tag: "Loaded",
    flat: { ...seed, files },
  })
})

const readAutosave = (key: string) =>
  Effect.flatMap(KeyValueStore.KeyValueStore, (store) =>
    KeyValueStore.toSchemaStore(store, AutosaveSchema).get(key),
  )

/** An `Option<Workspace>` autosave in `/play`'s format, under `key`. */
const fromAutosave = Effect.fnUntraced(function* (
  key: string,
  source: "autosave" | "playground-autosave",
  options: LoadOptions,
) {
  const saved = Option.flatten(yield* readAutosave(key))
  if (Option.isNone(saved)) {
    return Option.none<Candidate>()
  }
  return Option.some(
    yield* fromShareWorkspace(saved.value, source, PLAYGROUND_PATH, options),
  )
})

/**
 * `/play`'s autosave, read only while the Scratchpad has never saved. A
 * Scratchpad autosave of `None` (a Reset cleared it) means the seed.
 */
const fromPlaygroundAutosave = Effect.fnUntraced(function* (
  options: LoadOptions,
) {
  const own = yield* readAutosave(SCRATCHPAD_AUTOSAVE_KEY).pipe(
    Effect.orElseSucceed(() => Option.none()),
  )
  if (Option.isSome(own)) {
    return Option.none<Candidate>()
  }
  return yield* fromAutosave(
    PLAYGROUND_AUTOSAVE_KEY,
    "playground-autosave",
    options,
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
  effectVersion: effectVersionOfFiles(flat.files),
  notice,
})

/**
 * The seed a visit without a workspace opens: the version in `?version`,
 * else the one the visitor last picked with the toggle, else v4.
 */
const seedVersion = Effect.fnUntraced(function* (location: ScratchpadLocation) {
  const param = optionalParam(
    new URLSearchParams(stripPrefix(location.search, "?")),
    "version",
  ).pipe(Option.flatMap(decodeVersion))
  if (Option.isSome(param)) {
    return param.value
  }
  const preference = yield* readEffectVersionPreference
  return Option.getOrElse(preference, (): EffectVersion => "v4")
})

/**
 * Picks the Workspace the Scratchpad opens with, trying in order: the
 * `#<hash>` Share, a `?code=` link, the Scratchpad autosave, `/play`'s
 * autosave (only while the Scratchpad has never saved or been reset), then
 * the seed for
 * `seedVersion`. Effect v3 and v4 workspaces both load.
 *
 * A source that fails (a corrupt hash, an unreachable shortener, an autosave
 * that doesn't decode) is logged and skipped. A source that is found but
 * can't open here (over the limits) stops the search: the seed loads with a
 * notice linking to the same source on `/play`.
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
    ["playground-autosave", fromPlaygroundAutosave(options)],
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
        scratchpadSeed(yield* seedVersion(location)),
        Option.some(candidate.value.notice),
      )
    }
    yield* Effect.logInfo(`Scratchpad: loaded the workspace from the ${source}`)
    return loaded(source, candidate.value.flat, Option.none())
  }
  return loaded(
    "seed",
    scratchpadSeed(yield* seedVersion(location)),
    Option.none(),
  )
})
