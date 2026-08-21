import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  accessSync,
  constants,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import {
  Application,
  Comment,
  CommentTag,
  MinimalSourceFile,
  type ProjectReflection,
  ReflectionKind,
  normalizePath,
} from "typedoc"
import TypeScript from "typescript"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const websiteDirectory = resolve(scriptDirectory, "../../..")
const outputMarker = ".effect-api-reference"
const ignoredDirectoryNames = new Set([
  ".git",
  "build",
  "coverage",
  "dist",
  "docs",
  "node_modules",
])
// These modules exceeded one second in the PR 1408 Astro preview build.
const excludedModuleExports = new Map([
  ["@effect/ai-anthropic", new Set(["./Generated"])],
  ["@effect/ai-openai", new Set(["./Generated"])],
  ["@effect/ai-openrouter", new Set(["./Generated"])],
])
export interface GenerateOptions {
  readonly version: string
  readonly repository?: string | undefined
  readonly output?: string | undefined
  readonly package?: string | undefined
}

interface PackageManifest {
  readonly name: string
  readonly version: string
  readonly private: unknown
  readonly exports: unknown
  readonly description: unknown
}

interface PackageInfo {
  readonly directory: string
  readonly manifest: PackageManifest
}

interface ModuleInfo {
  readonly exportPath: string
  readonly outputPath: string
  readonly source: string
}

interface GeneratedModule {
  readonly export: string
  readonly source: string
  readonly json: string
  readonly sha256: string
  readonly barrel: string | undefined
}

interface JsDocTag {
  readonly tag: string
  readonly content: string
}

export async function generate(options: GenerateOptions): Promise<void> {
  if (!/^v\d+$/.test(options.version)) {
    throw new Error(
      "--version must be a major-version channel such as v3 or v4",
    )
  }
  const repositoryDirectory = resolve(
    websiteDirectory,
    options.repository ?? "../effect",
  )
  const outputDirectory = resolve(
    websiteDirectory,
    options.output ?? join("apps/web/.data/api-reference", options.version),
  )

  assertDirectory(repositoryDirectory, "Effect repository")
  assertSafeOutputDirectory(outputDirectory, repositoryDirectory)

  const packagesDirectory = join(repositoryDirectory, "packages")
  assertDirectory(packagesDirectory, "Effect packages directory")

  const packages = discoverPackages(packagesDirectory)
    .filter(
      ({ manifest }) =>
        manifest.private !== true && manifest.exports !== undefined,
    )
    .filter(
      ({ manifest }) =>
        options.package === undefined || manifest.name === options.package,
    )
    .sort((left, right) =>
      compareStrings(left.manifest.name, right.manifest.name),
    )

  if (packages.length === 0) {
    const suffix =
      options.package === undefined
        ? ""
        : ` matching ${JSON.stringify(options.package)}`
    throw new Error(
      `No public packages with export maps were found${suffix} in ${packagesDirectory}`,
    )
  }

  prepareOutputDirectory(outputDirectory)

  const revision = readRevision(repositoryDirectory)
  const packageManifests = []

  for (const packageInfo of packages) {
    const discoveredModules = discoverModules(
      packageInfo.directory,
      packageInfo.manifest.exports,
    )
    const excludedExports =
      excludedModuleExports.get(packageInfo.manifest.name) ?? new Set()
    const slowModules = discoveredModules.filter(({ exportPath }) =>
      excludedExports.has(exportPath),
    )
    const internalModules = discoveredModules.filter(isInternalModule)
    const includedModules = discoveredModules
      .filter(({ exportPath }) => !excludedExports.has(exportPath))
      .filter((module) => !isInternalModule(module))
    if (includedModules.length === 0) {
      continue
    }
    if (includedModules.some(({ outputPath }) => outputPath === "manifest")) {
      throw new Error(
        `${packageInfo.manifest.name} exports a module which would overwrite its generated manifest`,
      )
    }

    const barrels = includedModules.filter(isBarrelModule)
    const modules = includedModules.filter((module) => !isBarrelModule(module))

    console.log(
      `Generating ${packageInfo.manifest.name} (${modules.length} modules, ${barrels.length} barrels excluded, ${internalModules.length} internal modules excluded, ${slowModules.length} slow modules excluded)`,
    )
    const generatedModules =
      modules.length === 0
        ? []
        : await generatePackage(
            packageInfo,
            modules,
            barrels,
            repositoryDirectory,
            outputDirectory,
            revision,
          )
    const packageOutputDirectory = packageOutputPath(
      outputDirectory,
      packageInfo.manifest.name,
    )
    const packageManifest = {
      schemaVersion: 3,
      channel: options.version,
      name: packageInfo.manifest.name,
      version: packageInfo.manifest.version,
      revision,
      description:
        typeof packageInfo.manifest.description === "string"
          ? packageInfo.manifest.description
          : packageInfo.manifest.name,
      npmUrl: `https://www.npmjs.com/package/${packageInfo.manifest.name}`,
      sourceUrl: `https://github.com/Effect-TS/effect/tree/${revision}/${toPosixPath(relative(repositoryDirectory, packageInfo.directory))}`,
      barrels: barrels.map((barrel) => ({
        export: barrel.exportPath,
        source: toPosixPath(relative(packageInfo.directory, barrel.source)),
      })),
      modules: generatedModules,
    }

    writeJson(join(packageOutputDirectory, "manifest.json"), packageManifest)
    packageManifests.push({
      name: packageInfo.manifest.name,
      version: packageInfo.manifest.version,
      manifest: toPosixPath(
        relative(
          outputDirectory,
          join(packageOutputDirectory, "manifest.json"),
        ),
      ),
    })
  }

  writeJson(join(outputDirectory, "manifest.json"), {
    datasetSchemaVersion: 1,
    channel: options.version,
    typedocVersion: Application.VERSION,
    typedocSchemaVersion: "2.0",
    revision,
    packages: packageManifests,
  })

  console.log(
    `Generated ${packageManifests.length} packages in ${outputDirectory}`,
  )
}

async function generatePackage(
  packageInfo: PackageInfo,
  modules: ReadonlyArray<ModuleInfo>,
  barrels: ReadonlyArray<ModuleInfo>,
  repository: string,
  output: string,
  revision: string,
): Promise<Array<GeneratedModule>> {
  const tsconfig = join(packageInfo.directory, "tsconfig.json")
  accessSync(tsconfig, constants.R_OK)

  const app = await Application.bootstrap({
    name: packageInfo.manifest.name,
    entryPoints: modules.map(({ source }) => source),
    entryPointStrategy: "resolve",
    tsconfig,
    basePath: repository,
    displayBasePath: repository,
    alwaysCreateEntryPointModule: true,
    excludeInternal: true,
    excludePrivate: true,
    excludeProtected: true,
    // Effect uses TypeScript 7, while TypeDoc currently requires TypeScript 6.
    skipErrorChecking: true,
    gitRevision: revision,
    pretty: false,
    validation: {
      invalidLink: false,
      notDocumented: false,
      notExported: false,
    },
  })

  const entryPoints = app.getEntryPoints()
  if (entryPoints === undefined) {
    throw new Error(
      `TypeDoc could not resolve the entry points for ${packageInfo.manifest.name}`,
    )
  }

  await app.initializeRepositories(entryPoints)

  const entryPointsBySource = new Map(
    entryPoints.map((entryPoint) => [
      resolve(entryPoint.sourceFile.fileName),
      entryPoint,
    ]),
  )
  const packageDirectory = packageOutputPath(output, packageInfo.manifest.name)
  const generated: Array<GeneratedModule> = []

  for (const module of modules) {
    const entryPoint = entryPointsBySource.get(resolve(module.source))
    if (entryPoint === undefined) {
      throw new Error(
        `TypeDoc did not create an entry point for ${module.source}`,
      )
    }

    entryPoint.displayName =
      module.exportPath === "."
        ? packageInfo.manifest.name
        : `${packageInfo.manifest.name}/${module.exportPath.replace(/^\.\//, "")}`
    const project = app.converter.convert([entryPoint])
    attachLeadingModuleComment(app, project, module.source)
    app.validate(project)

    const jsonPath = join(packageDirectory, `${module.outputPath}.json`)
    mkdirSync(dirname(jsonPath), { recursive: true })
    await app.generateJson(project, jsonPath)

    generated.push({
      export: module.exportPath,
      source: toPosixPath(relative(packageInfo.directory, module.source)),
      json: toPosixPath(relative(packageDirectory, jsonPath)),
      sha256: hashFile(jsonPath),
      barrel: nearestBarrel(module.exportPath, barrels)?.exportPath,
    })
  }

  return generated
}

function attachLeadingModuleComment(
  app: Application,
  project: ProjectReflection,
  sourcePath: string,
): void {
  // Effect uses untagged leading JSDoc for module docs, while TypeDoc requires an explicit file tag.
  const moduleReflection = project.children?.find(
    (reflection) => reflection.kind === ReflectionKind.Module,
  )
  if (
    moduleReflection === undefined ||
    moduleReflection.comment !== undefined
  ) {
    return
  }

  const source = readFileSync(sourcePath, "utf8")
  const match = /^\s*\/\*\*([\s\S]*?)\*\//.exec(source)
  if (match === null) {
    return
  }

  const parsed = splitJsDocComment(match[1] ?? "")
  if (parsed.summary.length === 0) {
    return
  }

  const parseMarkdown = (text: string) =>
    app.converter.parseRawComment(
      new MinimalSourceFile(text, normalizePath(sourcePath)),
      project.files,
    ).content
  const comment = new Comment(
    parseMarkdown(parsed.summary),
    parsed.tags
      .filter(({ tag }) => tag !== "@module" && tag !== "@packageDocumentation")
      .map(
        ({ tag, content }) =>
          new CommentTag(`@${tag.slice(1)}`, parseMarkdown(content)),
      ),
  )
  comment.sourcePath = normalizePath(sourcePath)
  moduleReflection.comment = comment
  app.converter.resolveLinks(comment, moduleReflection)
}

function splitJsDocComment(comment: string): {
  readonly summary: string
  readonly tags: ReadonlyArray<JsDocTag>
} {
  const lines = comment
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, "").replace(/\s+$/, ""))
  const summary: Array<string> = []
  const tags: Array<{ readonly tag: string; readonly lines: Array<string> }> =
    []
  let currentTag:
    | { readonly tag: string; readonly lines: Array<string> }
    | undefined
  let fenced = false

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
    }
    const tagMatch = fenced
      ? null
      : /^\s*(@[a-zA-Z][\w-]*)(?:\s+(.*))?$/.exec(line)
    if (tagMatch !== null) {
      currentTag = { tag: tagMatch[1], lines: [tagMatch[2] ?? ""] }
      tags.push(currentTag)
    } else if (currentTag === undefined) {
      summary.push(line)
    } else {
      currentTag.lines.push(line)
    }
  }

  return {
    summary: summary.join("\n").trim(),
    tags: tags.map(({ tag, lines: content }) => ({
      tag,
      content: content.join("\n").trim(),
    })),
  }
}

function discoverPackages(directory: string): Array<PackageInfo> {
  const packages: Array<PackageInfo> = []

  for (const entry of sortedDirectoryEntries(directory)) {
    if (!entry.isDirectory() || ignoredDirectoryNames.has(entry.name)) {
      continue
    }

    const childDirectory = join(directory, entry.name)
    const manifestPath = join(childDirectory, "package.json")

    try {
      const manifest = readJson(manifestPath)
      if (
        Predicate.isObject(manifest) &&
        typeof manifest.name === "string" &&
        typeof manifest.version === "string"
      ) {
        packages.push({
          directory: childDirectory,
          manifest: {
            name: manifest.name,
            version: manifest.version,
            private: manifest.private,
            exports: manifest.exports,
            description: manifest.description,
          },
        })
        continue
      }
    } catch (error) {
      if (
        !Predicate.isObject(error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error
      }
    }

    packages.push(...discoverPackages(childDirectory))
  }

  return packages
}

function discoverModules(
  packageDirectory: string,
  exportsField: unknown,
): Array<ModuleInfo> {
  const exportEntries = normalizeExportEntries(exportsField)
  const blockedExports = exportEntries
    .filter(([, target]) => target === null)
    .map(([exportPath]) => exportPath)
  const sourceFiles = listFiles(packageDirectory)
    .map((path) => ({
      absolute: path,
      relative: `./${toPosixPath(relative(packageDirectory, path))}`,
    }))
    .filter(({ relative: path }) => isTypeScriptSource(path))
  const modules = new Map<string, ModuleInfo>()

  for (const [exportPattern, target] of exportEntries) {
    if (target === null) {
      continue
    }

    for (const targetPattern of sourceTargets(target)) {
      if (exportPattern.includes("*") !== targetPattern.includes("*")) {
        continue
      }

      if (targetPattern.includes("*")) {
        const targetMatcher = patternMatcher(targetPattern)

        for (const sourceFile of sourceFiles) {
          const match = targetMatcher.exec(sourceFile.relative)
          if (match === null) {
            continue
          }

          const exportPath = exportPattern.replaceAll("*", match[1])
          addModule(modules, blockedExports, exportPath, sourceFile.absolute)
        }
      } else {
        const source = resolve(packageDirectory, targetPattern)
        if (isTypeScriptSource(targetPattern) && isFile(source)) {
          addModule(modules, blockedExports, exportPattern, source)
        }
      }
    }
  }

  return [...modules.values()].sort((left, right) =>
    compareStrings(left.exportPath, right.exportPath),
  )
}

function addModule(
  modules: Map<string, ModuleInfo>,
  blockedExports: ReadonlyArray<string>,
  exportPath: string,
  source: string,
): void {
  if (blockedExports.some((pattern) => patternMatches(pattern, exportPath))) {
    return
  }

  const outputPath =
    exportPath === "." ? "index" : exportPath.replace(/^\.\//, "")
  if (
    outputPath.length === 0 ||
    outputPath
      .split("/")
      .some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(
      `Cannot derive a safe output path from package export ${JSON.stringify(exportPath)}`,
    )
  }

  const existing = modules.get(outputPath)
  if (existing !== undefined) {
    if (existing.source !== source) {
      throw new Error(
        `${exportPath} and ${existing.exportPath} both map to ${outputPath}.json`,
      )
    }
    return
  }

  modules.set(outputPath, { exportPath, outputPath, source })
}

function isBarrelModule(module: ModuleInfo): boolean {
  const source = readFileSync(module.source, "utf8")
  if (source.includes("@barrel:")) {
    return true
  }
  const sourceFile = TypeScript.createSourceFile(
    module.source,
    source,
    TypeScript.ScriptTarget.Latest,
    false,
    TypeScript.ScriptKind.TS,
  )
  return (
    sourceFile.statements.length > 0 &&
    sourceFile.statements.every(
      (statement) =>
        TypeScript.isExportDeclaration(statement) &&
        statement.moduleSpecifier !== undefined,
    )
  )
}

function isInternalModule(module: ModuleInfo): boolean {
  return module.exportPath.replace(/^\.\//, "").split("/").includes("internal")
}

function nearestBarrel(
  exportPath: string,
  barrels: ReadonlyArray<ModuleInfo>,
): ModuleInfo | undefined {
  return barrels
    .filter(
      (barrel) =>
        barrel.exportPath === "." ||
        exportPath.startsWith(`${barrel.exportPath}/`),
    )
    .sort((left, right) => right.exportPath.length - left.exportPath.length)[0]
}

function normalizeExportEntries(
  exportsField: unknown,
): Array<readonly [string, unknown]> {
  if (
    typeof exportsField === "string" ||
    exportsField === null ||
    Array.isArray(exportsField) ||
    (Predicate.isObject(exportsField) &&
      Object.keys(exportsField).every((key) => !key.startsWith(".")))
  ) {
    return [[".", exportsField]]
  }

  if (!Predicate.isObject(exportsField)) {
    return []
  }

  return Object.entries(exportsField).sort(([left], [right]) =>
    compareStrings(left, right),
  )
}

function sourceTargets(target: unknown): Array<string> {
  if (typeof target === "string") {
    return isTypeScriptSource(target) ? [target] : []
  }
  if (Array.isArray(target)) {
    return target.flatMap(sourceTargets)
  }
  if (Predicate.isObject(target)) {
    return Object.values(target).flatMap(sourceTargets)
  }
  return []
}

function listFiles(directory: string): Array<string> {
  const files: Array<string> = []

  for (const entry of sortedDirectoryEntries(directory)) {
    if (ignoredDirectoryNames.has(entry.name)) {
      continue
    }

    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...listFiles(path))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

function patternMatcher(pattern: string): RegExp {
  const parts = pattern.split("*")
  if (parts.length !== 2) {
    throw new Error(
      `Only one wildcard is supported in package export patterns: ${pattern}`,
    )
  }
  return new RegExp(`^${escapeRegExp(parts[0])}(.*)${escapeRegExp(parts[1])}$`)
}

function patternMatches(pattern: string, value: string): boolean {
  return pattern.includes("*")
    ? patternMatcher(pattern).test(value)
    : pattern === value
}

function assertDirectory(path: string, label: string): void {
  if (!statSync(path, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`${label} does not exist or is not a directory: ${path}`)
  }
}

function assertSafeOutputDirectory(
  path: string,
  repositoryDirectory: string,
): void {
  if (
    !isAbsolute(path) ||
    path === resolve(path, sep) ||
    path === websiteDirectory ||
    path === repositoryDirectory
  ) {
    throw new Error(`Refusing to replace unsafe output directory: ${path}`)
  }
}

function prepareOutputDirectory(path: string): void {
  const status = statSync(path, { throwIfNoEntry: false })
  if (status !== undefined) {
    if (!status.isDirectory()) {
      throw new Error(`Output path exists and is not a directory: ${path}`)
    }
    if (!isFile(join(path, outputMarker)) && readdirSync(path).length > 0) {
      throw new Error(
        `Refusing to replace an existing directory not created by this generator: ${path}`,
      )
    }
    rmSync(path, { recursive: true })
  }

  mkdirSync(path, { recursive: true })
  writeFileSync(join(path, outputMarker), "")
}

function packageOutputPath(output: string, packageName: string): string {
  const parts = packageName.split("/")
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(
      `Cannot derive a safe output path from package name ${JSON.stringify(packageName)}`,
    )
  }
  return join(output, ...parts)
}

function readRevision(repository: string): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).trim()
  } catch (cause) {
    throw new Error(`Could not read the Git revision for ${repository}`, {
      cause,
    })
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function sortedDirectoryEntries(directory: string) {
  return readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    compareStrings(left.name, right.name),
  )
}

function isFile(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isFile() === true
}

function isTypeScriptSource(path: string): boolean {
  return /(?<!\.d)\.(?:[cm]?ts|tsx)$/.test(path)
}

function toPosixPath(path: string): string {
  return path.split(sep).join("/")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export class GenerateError extends Data.TaggedError("GenerateError")<{
  readonly message: string
  readonly cause: unknown
}> {}

export class Generate extends Context.Service<
  Generate,
  {
    readonly run: (
      options: GenerateOptions,
    ) => Effect.Effect<void, GenerateError>
  }
>()("@website/api-reference/Generate", {
  make: Effect.succeed({
    run: Effect.fn("Generate.run")(function* (options: GenerateOptions) {
      yield* Effect.tryPromise({
        try: () => generate(options),
        catch: (cause) =>
          new GenerateError({
            message: `Unable to generate API reference data for ${options.version}`,
            cause,
          }),
      })
    }),
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
