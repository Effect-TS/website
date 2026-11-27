import {
  File,
  type Directory,
  type FileTree,
  makeDirectory,
  makeDefaultWorkspace,
  Workspace,
  type WorkspaceShell,
} from "./workspace"

/**
 * Per-node fields of the share format that a flat `path → content` map can't
 * hold. Listed in tree order, so a round trip keeps the original ordering.
 */
export type FlatNodeMetadata =
  | {
      readonly _tag: "File"
      readonly path: string
      readonly language?: string
      readonly userManaged?: boolean
      readonly solution?: string
    }
  | {
      readonly _tag: "Directory"
      readonly path: string
      readonly userManaged: boolean
    }

/**
 * The share format's non-file fields. The Scratchpad ignores `prepare`,
 * `shells` and `snapshots` but writes them back so `/play` can still open
 * its shares.
 */
export interface FlatWorkspaceMetadata {
  readonly name: string
  readonly initialFilePath: string | undefined
  readonly prepare: string
  readonly shells: ReadonlyArray<WorkspaceShell>
  readonly snapshots: ReadonlyArray<string> | undefined
  readonly nodes: ReadonlyArray<FlatNodeMetadata>
}

/**
 * A share-format `Workspace` as a flat map of file paths to contents, plus
 * the empty directories the map can't express.
 */
export interface FlatWorkspace {
  readonly files: Readonly<Record<string, string>>
  readonly directories: ReadonlyArray<string>
  /**
   * Absent for a Workspace that never came from the share format, such as
   * the Scratchpad seed. `fromFlatWorkspace` then uses the defaults of the
   * matching `/play` template.
   */
  readonly metadata?: FlatWorkspaceMetadata | undefined
}

/** The Monaco language id `/play` assigns to a file it has no metadata for. */
export function languageFromPath(path: string): string {
  if (path.endsWith(".json")) return "json"
  if (path.endsWith(".tsx")) return "typescriptreact"
  if (path.endsWith(".jsx")) return "javascriptreact"
  if (/\.(?:c|m)?js$/.test(path)) return "javascript"
  if (/\.(?:c|m)?ts$/.test(path)) return "typescript"
  return "plaintext"
}

export function toFlatWorkspace(workspace: Workspace): FlatWorkspace {
  const files: Record<string, string> = {}
  const directories: Array<string> = []
  const nodes: Array<FlatNodeMetadata> = []
  const walk = (prefix: string, children: FileTree) => {
    for (const node of children) {
      const path = `${prefix}${node.name}`
      if (node._tag === "File") {
        files[path] = node.initialContent
        nodes.push({ _tag: "File", path, ...fileFields(node) })
        continue
      }
      nodes.push({
        _tag: "Directory",
        path,
        userManaged: node.userManaged ?? false,
      })
      if (node.children.length === 0) {
        directories.push(path)
      }
      walk(`${path}/`, node.children)
    }
  }
  walk("", workspace.tree)
  return {
    files,
    directories,
    metadata: {
      name: workspace.name,
      initialFilePath: workspace.initialFilePath,
      prepare: workspace.prepare,
      shells: workspace.shells,
      snapshots: workspace.snapshots,
      nodes,
    },
  }
}

/**
 * `File`'s optional fields, copied without turning an absent key into an
 * `undefined` one, which `File` rejects and structural equality would see.
 */
function fileFields(source: {
  readonly language?: string | undefined
  readonly userManaged?: boolean | undefined
  readonly solution?: string | undefined
}) {
  return {
    ...(source.language === undefined ? {} : { language: source.language }),
    ...(source.userManaged === undefined
      ? {}
      : { userManaged: source.userManaged }),
    ...(source.solution === undefined ? {} : { solution: source.solution }),
  }
}

interface DirectoryBuilder {
  readonly name: string
  readonly userManaged: boolean
  readonly children: Array<DirectoryBuilder | File>
}

/**
 * Rebuilds the share-format tree from a flat map. Nodes listed in the
 * metadata keep their position and fields; new files and directories follow
 * in map order, with the language `/play` would infer from the path.
 */
export function fromFlatWorkspace(flat: FlatWorkspace): Workspace {
  const nodeMetadata = new Map(
    (flat.metadata?.nodes ?? []).map((node) => [node.path, node]),
  )
  const root: DirectoryBuilder = { name: "", userManaged: false, children: [] }
  const directories = new Map<string, DirectoryBuilder>([["", root]])

  const ensureDirectory = (path: string): DirectoryBuilder => {
    const existing = directories.get(path)
    if (existing !== undefined) {
      return existing
    }
    const slash = path.lastIndexOf("/")
    const parent = ensureDirectory(slash === -1 ? "" : path.slice(0, slash))
    const metadata = nodeMetadata.get(path)
    const directory: DirectoryBuilder = {
      name: path.slice(slash + 1),
      userManaged: metadata?.userManaged ?? false,
      children: [],
    }
    parent.children.push(directory)
    directories.set(path, directory)
    return directory
  }

  const added = new Set<string>()
  const addFile = (path: string, content: string) => {
    added.add(path)
    const slash = path.lastIndexOf("/")
    const parent = ensureDirectory(slash === -1 ? "" : path.slice(0, slash))
    const metadata = nodeMetadata.get(path)
    const name = path.slice(slash + 1)
    parent.children.push(
      metadata?._tag === "File"
        ? new File({ name, initialContent: content, ...fileFields(metadata) })
        : new File({
            name,
            initialContent: content,
            language: languageFromPath(path),
            userManaged: false,
          }),
    )
  }

  const listedDirectories = new Set(flat.directories)
  const isDirectoryPresent = (path: string) =>
    listedDirectories.has(path) ||
    Object.keys(flat.files).some((file) => file.startsWith(`${path}/`)) ||
    flat.directories.some((directory) => directory.startsWith(`${path}/`))

  for (const node of nodeMetadata.values()) {
    if (node._tag === "File") {
      const content = flat.files[node.path]
      if (content !== undefined) {
        addFile(node.path, content)
      }
    } else if (isDirectoryPresent(node.path)) {
      ensureDirectory(node.path)
    }
  }
  for (const [path, content] of Object.entries(flat.files)) {
    if (!added.has(path)) {
      addFile(path, content)
    }
  }
  for (const path of flat.directories) {
    ensureDirectory(path)
  }

  const freeze = (children: ReadonlyArray<DirectoryBuilder | File>): FileTree =>
    children.map((node): File | Directory =>
      node instanceof File
        ? node
        : makeDirectory(node.name, freeze(node.children), node.userManaged),
    )
  const tree = freeze(root.children)

  if (flat.metadata !== undefined) {
    return new Workspace(
      {
        name: flat.metadata.name,
        tree,
        initialFilePath: flat.metadata.initialFilePath,
        prepare: flat.metadata.prepare,
        shells: flat.metadata.shells,
        snapshots: flat.metadata.snapshots,
      },
      { disableChecks: true },
    )
  }

  const draft = new Workspace(
    { name: "", tree, prepare: "pnpm install", shells: [], snapshots: [] },
    { disableChecks: true },
  )
  const reference = makeDefaultWorkspace(draft.effectVersion)
  return new Workspace(
    {
      name: reference.name,
      tree,
      initialFilePath:
        flat.files["src/main.ts"] === undefined ? undefined : "src/main.ts",
      prepare: "pnpm install",
      shells: reference.shells,
      snapshots: [],
    },
    { disableChecks: true },
  )
}
