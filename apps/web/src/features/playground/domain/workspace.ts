import * as Brand from "effect/Brand"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Iterable from "effect/Iterable"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

export type FullPath = Brand.Branded<string, "FullPath">
export const FullPath = Brand.nominal<FullPath>()

export const EffectVersion = Schema.Literals(["v3", "v4"])
export type EffectVersion = typeof EffectVersion.Type

export const defaultVersion: EffectVersion = "v4"

export class WorkspaceShell extends Schema.Class<WorkspaceShell>(
  "WorkspaceShell",
)({
  command: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
}) {}

export class WorkspaceTerminal extends Data.Class<{
  command: string | undefined
}> {}

export class File extends Schema.TaggedClass<File>()("File", {
  name: Schema.String,
  initialContent: Schema.String,
  solution: Schema.String.pipe(Schema.optional),
  language: Schema.String.pipe(
    Schema.optionalKey,
    Schema.withDecodingDefaultKey(Effect.succeed("typescript")),
  ),
  userManaged: Schema.Boolean.pipe(
    Schema.optionalKey,
    Schema.withDecodingDefaultKey(Effect.succeed(false)),
  ),
}) {
  withContent(content: string) {
    return new File({
      ...this,
      initialContent: content,
    })
  }
}
export function makeFile(
  name: string,
  content: string,
  userManaged = false,
): File {
  return new File({ name, userManaged, initialContent: content })
}

export interface Directory {
  readonly _tag: "Directory"
  readonly name: string
  readonly userManaged?: boolean
  readonly children: ReadonlyArray<Directory | File>
}
const Directory_: Schema.Codec<Directory, any, never, never> = Schema.Struct({
  _tag: Schema.tag("Directory"),
  name: Schema.String,
  userManaged: Schema.Boolean.pipe(
    Schema.optionalKey,
    Schema.withDecodingDefaultKey(Effect.succeed(false)),
  ),
  children: Schema.Array(
    Schema.Union([
      File,
      Schema.suspend(
        (): Schema.Codec<Directory, any, never, never> => Directory_,
      ),
    ]),
  ),
})
export const Directory: Schema.Codec<Directory, any, never, never> = Directory_
export function makeDirectory(
  name: string,
  children: ReadonlyArray<File | Directory>,
  userManaged: boolean = false,
): Directory {
  return { _tag: "Directory", name, userManaged, children }
}

export const FileTree = Schema.Array(Schema.Union([File, Directory_]))
export type FileTree = ReadonlyArray<File | Directory>

export declare namespace Workspace {
  export type FileType = "File" | "Directory"

  export interface CreateFileOptions {
    readonly parent?: Directory
  }
}

export interface WorkspaceCreate {
  readonly name: string
  readonly dependencies?: Record<string, string>
  readonly tree?: ReadonlyArray<Directory | File>
  readonly initialFilePath?: string | undefined
  readonly prepare?: string
  readonly shells: ReadonlyArray<WorkspaceShell>
  readonly snapshots?: ReadonlyArray<string>
}

export class Workspace extends Schema.Class<Workspace>("Workspace")({
  name: Schema.String,
  tree: FileTree,
  initialFilePath: Schema.optional(Schema.String),
  prepare: Schema.String,
  shells: Schema.Array(WorkspaceShell),
  snapshots: Schema.Array(Schema.String).pipe(
    Schema.optional,
    Schema.withDecodingDefault(
      Effect.succeed(Array.from({ length: 10 }, (_, i) => `snapshot-${i}`)),
    ),
  ),
}) {
  get filePaths(): Map<File | Directory, string> {
    return makeFilePaths(this.tree)
  }

  static new(options: WorkspaceCreate): Workspace {
    let prepare = options.prepare ?? "pnpm install"
    if (options.dependencies !== undefined) {
      const dependencies = Object.entries(options.dependencies)
        .map(([name, version]) => `${name}@${version}`)
        .join(" ")
      prepare = `${prepare} -E ${dependencies}`
    }
    return new Workspace(
      {
        name: options.name,
        initialFilePath: options.initialFilePath,
        prepare,
        shells: options.shells,
        snapshots: options.snapshots ?? [],
        tree: [
          ...(options.dependencies
            ? [
                new File({
                  name: "package.json",
                  language: "json",
                  initialContent: JSON.stringify(
                    { dependencies: options.dependencies },
                    undefined,
                    2,
                  ),
                }),
                ...defaultFiles,
              ]
            : []),
          ...(options.tree ?? []),
        ],
      },
      { disableChecks: true },
    )
  }

  private _clone(
    overrides: Partial<{
      name: string
      tree: FileTree
      initialFilePath: string | undefined
      prepare: string
      shells: ReadonlyArray<WorkspaceShell>
      snapshots: ReadonlyArray<string>
    }>,
  ): Workspace {
    return new Workspace(
      {
        name: overrides.name ?? this.name,
        tree: overrides.tree ?? this.tree,
        initialFilePath:
          overrides.initialFilePath !== undefined
            ? overrides.initialFilePath
            : this.initialFilePath,
        prepare: overrides.prepare ?? this.prepare,
        shells: overrides.shells ?? this.shells,
        snapshots: overrides.snapshots ?? this.snapshots,
      },
      { disableChecks: true },
    )
  }

  withName(name: string) {
    return this._clone({ name })
  }
  withPrepare(prepare: string) {
    return this._clone({ prepare })
  }
  get withNoSnapshot() {
    return this._clone({ snapshots: [] })
  }
  append(...children: FileTree) {
    return this._clone({ tree: [...this.tree, ...children] })
  }
  setTree(tree: FileTree) {
    return this._clone({ tree })
  }
  filterMap(f: (item: File | Directory) => Option.Option<File | Directory>) {
    return this.setTree(filterMapTree(this.tree, f))
  }
  replaceNode(node: File | Directory, replacement: File | Directory) {
    return this.filterMap((item) =>
      item === node ? Option.some(replacement) : Option.some(item),
    )
  }
  removeNode(node: File | Directory) {
    return this.filterMap((item) =>
      item === node ? Option.none() : Option.some(item),
    )
  }
  findFile(name: string): Option.Option<[File, string]> {
    return Iterable.findFirst(
      this.filePaths,
      (entry): entry is [File, string] =>
        entry[0]._tag === "File" && entry[1] === name,
    )
  }
  get initialFile(): File {
    if (this.initialFilePath) {
      return Option.getOrThrow(this.findFile(this.initialFilePath))[0]
    }
    return pipe(
      this.filePaths.keys(),
      Iterable.filter((_) => _._tag === "File"),
      Iterable.head,
      Option.getOrThrow,
    )
  }
  /**
   * Total even for a user-edited `package.json`: invalid JSON (e.g. mid-edit
   * autosave snapshots) or a missing `dependencies` key yield `{}`.
   */
  get dependencies(): Record<string, string> {
    return this.findFile("package.json").pipe(
      Option.flatMap(([file]) => {
        try {
          return Option.fromNullishOr(
            JSON.parse(file.initialContent).dependencies,
          )
        } catch {
          return Option.none()
        }
      }),
      Option.getOrElse(() => ({})),
    )
  }
  /**
   * The Effect major version this workspace runs on, derived from the `effect`
   * entry in `package.json`. Handles dist-tags (`rc`, `beta`, `next`), exact
   * versions written back by `pnpm install -E`, and ranges. `latest` and
   * missing entries map to v3, the version the playground shipped with before
   * the toggle existed.
   */
  get effectVersion(): EffectVersion {
    const effect = this.dependencies["effect"]
    if (effect === undefined) {
      return "v3"
    }
    if (effect === "rc" || effect === "beta") {
      return "v4"
    }
    return /^\D*4(\.|$)/.test(effect) ? "v4" : "v3"
  }
  pathTo(file: File | Directory) {
    return Option.fromNullishOr(this.filePaths.get(file))
  }
  fullPathTo(file: File | Directory) {
    return this.pathTo(file).pipe(
      Option.map((path) => FullPath(`${this.name}/${path}`)),
    )
  }
  relativePath(path: string) {
    return `${this.name.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
  }
  updateFiles<E, R>(
    f: (item: File, path: string) => Effect.Effect<File, E, R>,
  ) {
    const walk = (
      tree: ReadonlyArray<File | Directory>,
    ): Effect.Effect<ReadonlyArray<Directory | File>, E, R> =>
      Effect.gen({ self: this }, function* () {
        const out: Array<File | Directory> = []
        for (const node of tree) {
          if (node._tag === "File") {
            out.push(yield* f(node, this.filePaths.get(node)!))
          } else {
            out.push(
              makeDirectory(
                node.name,
                yield* walk(node.children),
                node.userManaged ?? false,
              ),
            )
          }
        }
        return out
      })
    return Effect.map(walk(this.tree), (tree) => this._clone({ tree }))
  }
  addShell(shell: WorkspaceShell) {
    return this._clone({ shells: [...this.shells, shell] })
  }
  removeShell(shell: WorkspaceShell) {
    return this._clone({ shells: this.shells.filter((s) => s !== shell) })
  }
  /**
   * Whether this workspace is unchanged from `baseline`, ignoring fields
   * that legitimately differ for reasons other than a user edit:
   * - `prepare`/`snapshots`: a live snapshot is always taken via
   *   `withPrepare("pnpm install").withNoSnapshot` (see
   *   `WorkspaceCompression.snapshot`), so both sides are normalized the
   *   same way before comparing.
   * - `package.json`: `pnpm install -E` rewrites it in place, resolving
   *   `"latest"` to whatever version actually got installed, so a live
   *   snapshot's `package.json` would never match a raw baseline's (e.g.
   *   `defaultWorkspace`'s, which still says `"latest"`) even with zero
   *   user edits.
   */
  isUnchangedFrom(baseline: Workspace): boolean {
    const normalize = (workspace: Workspace) =>
      workspace
        .withPrepare("pnpm install")
        .withNoSnapshot.filterMap((item) =>
          item.name === "package.json" ? Option.none() : Option.some(item),
        )
    return Equal.equals(normalize(this), normalize(baseline))
  }
  [Hash.symbol]() {
    return Hash.string(this.name)
  }
  /**
   * Compares only the schema-declared fields. Without this override, `Equal`
   * falls back to reflecting over the prototype and reads every getter as if
   * it were a field — including `withNoSnapshot`, which constructs a new
   * `Workspace` on access, recursing into comparing *that* instance's own
   * `withNoSnapshot` and so on forever (stack overflow on any comparison).
   */
  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof Workspace &&
      this.name === that.name &&
      this.initialFilePath === that.initialFilePath &&
      this.prepare === that.prepare &&
      Equal.equals(this.tree, that.tree) &&
      Equal.equals(this.shells, that.shells) &&
      Equal.equals(this.snapshots, that.snapshots)
    )
  }
}

export const defaultFiles = [
  new File({
    name: "dprint.json",
    language: "json",
    initialContent: JSON.stringify(
      {
        json: {
          indentWidth: 2,
          lineWidth: 120,
          trailingCommas: "never",
        },
        typescript: {
          indentWidth: 2,
          lineWidth: 120,
          operatorPosition: "maintain",
          semiColons: "asi",
          quoteStyle: "alwaysDouble",
          trailingCommas: "never",
          "arrowFunction.useParentheses": "force",
        },
        plugins: [
          "https://plugins.dprint.dev/json-0.22.0.wasm",
          "https://plugins.dprint.dev/typescript-0.96.1.wasm",
        ],
      },
      undefined,
      2,
    ),
  }),
  new File({
    name: "tsconfig.json",
    language: "json",
    initialContent: JSON.stringify(
      {
        compilerOptions: {
          allowSyntheticDefaultImports: true,
          exactOptionalPropertyTypes: true,
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          target: "esnext",
        },
        include: ["src"],
      },
      undefined,
      2,
    ),
  }),
]

function makeFilePaths(tree: FileTree) {
  const paths = new Map<File | Directory, string>()
  function walk(prefix: string, children: FileTree) {
    for (const child of children) {
      paths.set(child, `${prefix}${child.name}`)
      if (child._tag === "Directory") {
        walk(`${prefix}${child.name}/`, child.children)
      }
    }
  }
  walk("", tree)
  return paths
}

function filterMapTree(
  tree: FileTree,
  f: (node: File | Directory) => Option.Option<File | Directory>,
): FileTree {
  const out: Array<File | Directory> = []
  for (const node of tree) {
    const result = f(node)
    if (result._tag === "None") {
      continue
    }
    if (result.value === node && result.value._tag === "Directory") {
      out.push(
        makeDirectory(
          result.value.name,
          filterMapTree(result.value.children, f),
          result.value.userManaged ?? false,
        ),
      )
    } else {
      out.push(result.value)
    }
  }
  return out
}

const mainV3 = makeFile(
  "main.ts",
  `import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
import { DevToolsLayer } from "./DevTools"

const program = Effect.gen(function*() {
  yield* Effect.log("Welcome to the Effect Playground!")
}).pipe(Effect.withSpan("program", {
  attributes: { source: "Playground" }
}))

program.pipe(
  Effect.provide(DevToolsLayer),
  NodeRuntime.runMain
)
`,
)

const mainV4 = makeFile(
  "main.ts",
  `import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
import { DevToolsLayer } from "./DevTools"

const program = Effect.gen(function*() {
  yield* Effect.log("Welcome to the Effect v4 Playground!")
}).pipe(Effect.withSpan("program", {
  attributes: { source: "Playground" }
}))

NodeRuntime.runMain(program.pipe(
  Effect.provide(DevToolsLayer)
))
`,
)

const defaultMainFiles: Record<EffectVersion, File> = {
  v3: mainV3,
  v4: mainV4,
}

export function defaultMainFile(version: EffectVersion): File {
  return defaultMainFiles[version]
}

const devToolsV3 = makeFile(
  "DevTools.ts",
  `import { DevTools } from "@effect/experimental"
import { NodeSocket } from "@effect/platform-node"
import { Layer } from "effect"

export const DevToolsLayer = DevTools.layerSocket.pipe(
  Layer.provide(NodeSocket.layerNet({ port: 34437 }))
)
`,
)

const devToolsV4 = makeFile(
  "DevTools.ts",
  `import { NodeSocket } from "@effect/platform-node"
import { DevTools } from "effect/unstable/devtools"
import { Layer } from "effect"

export const DevToolsLayer = DevTools.layerSocket.pipe(
  Layer.provide(NodeSocket.layerNet({ port: 34437 }))
)
`,
)

/**
 * The v3 workspace keeps the pre-toggle name "playground" so existing
 * autosaves and share links keep working. The names must differ between
 * versions: switching swaps the workspace handle, and the outgoing handle's
 * unmount would otherwise delete the directory the incoming handle just
 * mounted.
 */
const defaultWorkspaces: Record<EffectVersion, Workspace> = {
  v3: Workspace.new({
    name: "playground",
    dependencies: {
      "@effect/experimental": "latest",
      "@effect/platform": "latest",
      "@effect/platform-node": "latest",
      "@types/node": "latest",
      effect: "latest",
      typescript: "6.0.2",
    },
    shells: [new WorkspaceShell({ command: "../run src/main.ts" })],
    initialFilePath: "src/main.ts",
    tree: [makeDirectory("src", [mainV3, devToolsV3])],
  }),
  v4: Workspace.new({
    name: "playground-v4",
    dependencies: {
      "@effect/platform-node": "rc",
      "@types/node": "latest",
      effect: "rc",
      typescript: "6.0.2",
    },
    shells: [new WorkspaceShell({ command: "../run src/main.ts" })],
    initialFilePath: "src/main.ts",
    tree: [makeDirectory("src", [mainV4, devToolsV4])],
  }),
}

export function makeDefaultWorkspace(version: EffectVersion): Workspace {
  return defaultWorkspaces[version]
}
