import { createRequire } from "node:module"
import * as path from "node:path"
import type {
  EditorLanguage,
  EditorFeature,
  IFeatureDefinition,
  IWorkerDefinition
} from "@effect/monaco-editor/esm/metadata"
import type { Plugin } from "vite"
const require = createRequire(import.meta.url)
const metadata = require("@effect/monaco-editor/esm/metadata")

export interface PluginMonacoEditorOptions {
  readonly globalAPI?: boolean
  readonly languages?: PluginMonacoEditorLanguages
  readonly customLanguages?: ReadonlyArray<IFeatureDefinition>
  readonly features?: PluginMonacoEditorFeatures
}

export type PluginMonacoEditorLanguages = "all" | ReadonlyArray<EditorLanguage>
export type PluginMonacoEditorFeatures = "all" | ReadonlyArray<EditorFeature | `!${EditorFeature}`>

function resolveLanguages(
  languages: PluginMonacoEditorLanguages,
  customLanguages: ReadonlyArray<IFeatureDefinition>
) {
  if (languages === "all") {
    return (metadata.languages as ReadonlyArray<IFeatureDefinition>)
      .concat(customLanguages)
      .filter((language) => language != null)
  }

  const languageById: Record<string, IFeatureDefinition> = {};

  (metadata.languages as ReadonlyArray<IFeatureDefinition>).forEach((language) => {
    languageById[language.label] = language
  })

  function resolveLanguage(label: string) {
    const lang = languageById[label]
    if (!lang) {
      console.error("[monaco-editor]: Unknown language detected: ", label)
      return null
    }
    return lang;
  }

  return languages
    .map(resolveLanguage)
    .concat(customLanguages)
    .filter((language) => language != null)
}

function resolveFeatures(
  features: PluginMonacoEditorFeatures
) {
  if (features === "all") {
    return (metadata.features as ReadonlyArray<IFeatureDefinition>)
  }

  const featureById: Record<string, IFeatureDefinition> = {};

  (metadata.features as ReadonlyArray<IFeatureDefinition>).forEach((feature) => {
    featureById[feature.label] = feature
  })

  featureById["codicons"] = {
    label: "codicons",
    entry: "vs/base/browser/ui/codicons/codiconStyles.js",
  }

  function resolveFeature(label: string) {
    const feature = featureById[label]
    if (!feature) {
      console.error("[monaco-editor]: Unknown feature detected: ", label)
      return null
    }
    return feature
  }

  const excluded = features
    .filter((feature) => feature[0] === "!")
    .map((feature) => feature.slice(1))

  if (excluded.length > 0) {
    return Object.keys(featureById)
      .filter((feature) => !excluded.includes(feature))
      .map(resolveFeature)
      .filter((feature) => feature != null)
  }

  return features
    .map(resolveFeature)
    .filter((feature) => feature != null)
}

const EDITOR_MODULE: IFeatureDefinition = {
  label: "editorWorkerService",
  entry: undefined,
  worker: {
    id: "vs/editor/editor",
    entry: "vs/editor/editor.worker",
  },
}
function resolveWorkers(
  languages: ReadonlyArray<IFeatureDefinition>,
  features: ReadonlyArray<IFeatureDefinition>
) {
  const modules = [EDITOR_MODULE].concat(languages).concat(features)
  const workers: Array<IWorkerDefinition & { readonly label: string }> = []
  modules.forEach((mod) => {
    if (mod.worker) {
      workers.push({
        label: mod.label,
        id: mod.worker.id,
        entry: mod.worker.entry,
      })
    }
  })
  return workers
}

function resolveModule(file: string) {
  const url = require.resolve(file).toString()
  return url.replace(/^file:\/\//, "")
}

function resolveMonacoPath(file: string) {
  try {
    return resolveModule(path.join("@effect/monaco-editor/esm", file))
  }
  catch (e) { }
  try {
    return resolveModule(path.join(process.cwd(), "node_modules/@effect/monaco-editor/esm", file))
  }
  catch (e) { }
  return resolveModule(file)
}

export function monacoEditorPlugin(options: PluginMonacoEditorOptions = {}): Plugin {
  const {
    globalAPI = false,
    languages = [],
    customLanguages = [],
    features = []
  } = options
  const resolvedLanguages = resolveLanguages(languages, customLanguages)
  const resolvedFeatures = resolveFeatures(features)
  const resolvedWorkers = resolveWorkers(resolvedLanguages, resolvedFeatures)
  return {
    name: "vite-plugin-monaco-editor",
    enforce: "pre",
    config(config) {
      if (config.optimizeDeps === undefined) {
        config.optimizeDeps = {}
      }
      if (config.optimizeDeps.exclude === undefined) {
        config.optimizeDeps.exclude = []
      }
      config.optimizeDeps.exclude.push("@effect/monaco-editor")
      if (config.optimizeDeps.include) {
        const include = config.optimizeDeps.include.filter((dep) => dep === "@effect/monaco-editor")
        config.optimizeDeps.include = include
      }
    },
    load(id) {
      if (id.match(/esm[/\\]vs[/\\]editor[/\\]editor.main.js/)) {
        const workerPaths = resolvedWorkers.map((worker) => `"${worker.label}": () => new ${worker.label}()`)
        const workerPathsJson = `{${workerPaths.join(",")}}`
        const workerImports = resolvedWorkers.map((worker) => `import ${worker.label} from "${resolveMonacoPath(worker.entry)}?worker"`)
        const featureImports = resolvedFeatures
          .flatMap((feature) => feature.entry === undefined ? [] : Array.isArray(feature.entry) ? feature.entry : [feature.entry])
          .map((entry) => `import "${resolveMonacoPath(entry)}"`)
        const languageImports = resolvedLanguages
          .flatMap((language) => language.entry === undefined ? [] : Array.isArray(language.entry) ? language.entry : [language.entry])
          .map((entry) => `import "${resolveMonacoPath(entry)}"`)
        const monacoEnvironment = `self["MonacoEnvironment"] = (function(paths) {
  return {
    globalAPI: ${globalAPI},
    getWorker: function(moduleId, label) {
      const result = paths[label]
      return result()
    }
  }
})(${workerPathsJson})`
        const editorExport = "export * from \"./editor.api.js\""
        return workerImports
          .concat([monacoEnvironment])
          .concat(featureImports)
          .concat(languageImports)
          .concat([editorExport])
          .join("\n")
      }
      else if (id.match(/esm[/\\]vs[/\\]editor[/\\]editor.all.js/)) {
        return "throw \"Please use 'esm/vs/editor.main.js' or '@effect/monaco-editor' directly instead!\""
      }
      else if (id.match(/esm[/\\]vs[/\\]editor[/\\]edcore.main.js/)) {
        return "throw \"Please use 'esm/vs/editor.main.js' or '@effect/monaco-editor' directly!\""
      }
      return null
    },
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        if (req.url?.includes("monaco-editor") && req.url?.includes("?worker_file")) {
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp")
        }
        next()
      })
    }
  }
}
