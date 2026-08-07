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
  ReflectionKind,
  normalizePath,
} from "typedoc"
import TypeScript from "typescript"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const websiteDirectory = resolve(scriptDirectory, "../..")
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
const argumentKeys = new Map([
  ["--repo", "repository"],
  ["--out", "output"],
  ["--package", "package"],
  ["--version", "version"],
])

const options = parseArguments(process.argv.slice(2))
if (options.version === undefined || !/^v\d+$/.test(options.version)) {
  throw new Error("--version must be a major-version channel such as v3 or v4")
}
const repositoryDirectory = resolve(
  websiteDirectory,
  options.repository ?? "../effect",
)
const outputDirectory = resolve(
  websiteDirectory,
  options.output ?? join(".data/api-reference", options.version),
)

assertDirectory(repositoryDirectory, "Effect repository")
assertSafeOutputDirectory(outputDirectory)

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
      relative(outputDirectory, join(packageOutputDirectory, "manifest.json")),
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

async function generatePackage(
  packageInfo,
  modules,
  barrels,
  repository,
  output,
) {
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
  const generated = []

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

function attachLeadingModuleComment(app, project, sourcePath) {
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

  const parseMarkdown = (text) =>
    app.converter.parseRawComment(
      new MinimalSourceFile(text, normalizePath(sourcePath)),
      project.files,
    ).content
  const comment = new Comment(
    parseMarkdown(parsed.summary),
    parsed.tags
      .filter(({ tag }) => tag !== "@module" && tag !== "@packageDocumentation")
      .map(({ tag, content }) => new CommentTag(tag, parseMarkdown(content))),
  )
  comment.sourcePath = normalizePath(sourcePath)
  moduleReflection.comment = comment
  app.converter.resolveLinks(comment, moduleReflection)
}

function splitJsDocComment(comment) {
  const lines = comment
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, "").replace(/\s+$/, ""))
  const summary = []
  const tags = []
  let currentTag
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

function discoverPackages(directory) {
  const packages = []

  for (const entry of sortedDirectoryEntries(directory)) {
    if (!entry.isDirectory() || ignoredDirectoryNames.has(entry.name)) {
      continue
    }

    const childDirectory = join(directory, entry.name)
    const manifestPath = join(childDirectory, "package.json")

    try {
      const manifest = readJson(manifestPath)
      if (typeof manifest.name === "string") {
        packages.push({ directory: childDirectory, manifest })
        continue
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error
      }
    }

    packages.push(...discoverPackages(childDirectory))
  }

  return packages
}

function discoverModules(packageDirectory, exportsField) {
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
  const modules = new Map()

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

function addModule(modules, blockedExports, exportPath, source) {
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

function isBarrelModule(module) {
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

function isInternalModule(module) {
  return module.exportPath.replace(/^\.\//, "").split("/").includes("internal")
}

function nearestBarrel(exportPath, barrels) {
  return barrels
    .filter(
      (barrel) =>
        barrel.exportPath === "." ||
        exportPath.startsWith(`${barrel.exportPath}/`),
    )
    .sort((left, right) => right.exportPath.length - left.exportPath.length)[0]
}

function normalizeExportEntries(exportsField) {
  if (
    typeof exportsField === "string" ||
    exportsField === null ||
    Array.isArray(exportsField) ||
    (isObject(exportsField) &&
      Object.keys(exportsField).every((key) => !key.startsWith(".")))
  ) {
    return [[".", exportsField]]
  }

  if (!isObject(exportsField)) {
    return []
  }

  return Object.entries(exportsField).sort(([left], [right]) =>
    compareStrings(left, right),
  )
}

function sourceTargets(target) {
  if (typeof target === "string") {
    return isTypeScriptSource(target) ? [target] : []
  }
  if (Array.isArray(target)) {
    return target.flatMap(sourceTargets)
  }
  if (isObject(target)) {
    return Object.values(target).flatMap(sourceTargets)
  }
  return []
}

function listFiles(directory) {
  const files = []

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

function patternMatcher(pattern) {
  const parts = pattern.split("*")
  if (parts.length !== 2) {
    throw new Error(
      `Only one wildcard is supported in package export patterns: ${pattern}`,
    )
  }
  return new RegExp(`^${escapeRegExp(parts[0])}(.*)${escapeRegExp(parts[1])}$`)
}

function patternMatches(pattern, value) {
  return pattern.includes("*")
    ? patternMatcher(pattern).test(value)
    : pattern === value
}

function parseArguments(arguments_) {
  const parsed = {}

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]
    if (argument === "--") {
      continue
    }
    if (argument === "--help") {
      console.log(`Usage: pnpm api-reference:generate -- [options]

Options:
  --repo <path>       Effect repository (default: ../effect)
  --out <path>        Output directory (default: .data/api-reference/<version>)
  --package <name>    Generate only one npm package
  --version <name>    Documentation channel, such as v3 or v4
  --help              Show this help`)
      process.exit(0)
    }

    const key = argumentKeys.get(argument)
    if (key === undefined) {
      throw new Error(`Unknown argument: ${argument}`)
    }

    const value = arguments_[index + 1]
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`)
    }
    parsed[key] = value
    index += 1
  }

  return parsed
}

function assertDirectory(path, label) {
  if (!statSync(path, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`${label} does not exist or is not a directory: ${path}`)
  }
}

function assertSafeOutputDirectory(path) {
  if (
    !isAbsolute(path) ||
    path === resolve(path, sep) ||
    path === websiteDirectory ||
    path === repositoryDirectory
  ) {
    throw new Error(`Refusing to replace unsafe output directory: ${path}`)
  }
}

function prepareOutputDirectory(path) {
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

function packageOutputPath(output, packageName) {
  const parts = packageName.split("/")
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(
      `Cannot derive a safe output path from package name ${JSON.stringify(packageName)}`,
    )
  }
  return join(output, ...parts)
}

function readRevision(repository) {
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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function sortedDirectoryEntries(directory) {
  return readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    compareStrings(left.name, right.name),
  )
}

function isFile(path) {
  return statSync(path, { throwIfNoEntry: false })?.isFile() === true
}

function isTypeScriptSource(path) {
  return /(?<!\.d)\.(?:[cm]?ts|tsx)$/.test(path)
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toPosixPath(path) {
  return path.split(sep).join("/")
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}
