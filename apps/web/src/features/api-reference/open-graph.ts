import type { ApiReferenceOgTemplateProps } from "@/services/OpenGraph"

export interface ApiReferenceOpenGraphEntry {
  readonly modulePath: string
  readonly packageDescription: string
  readonly packageName: string
  readonly packageSlug: string
  readonly revision: string
  readonly version: string
}

export interface ApiReferenceOpenGraphCard {
  readonly description: string
  readonly revision: string
  readonly template: ApiReferenceOgTemplateProps
}

export function resolveApiReferenceOpenGraph(
  documentPath: string,
  entries: ReadonlyArray<ApiReferenceOpenGraphEntry>,
): ApiReferenceOpenGraphCard | undefined {
  const [docs, version, api, packageSlug, ...moduleSegments] =
    documentPath.split("/")
  if (docs !== "docs" || version === undefined || api !== "api")
    return undefined

  const versionEntries = entries.filter((entry) => entry.version === version)
  const firstVersionEntry = versionEntries[0]
  if (firstVersionEntry === undefined) return undefined

  if (packageSlug === undefined) {
    return {
      description: `Browse the Effect ${version} API reference by package and module.`,
      revision: firstVersionEntry.revision,
      template: {
        eyebrow: "Effect Docs",
        title: "API Reference",
      },
    }
  }

  const packageEntries = versionEntries.filter(
    (entry) => entry.packageSlug === packageSlug,
  )
  const firstPackageEntry = packageEntries[0]
  if (firstPackageEntry === undefined) return undefined

  if (moduleSegments.length === 0) {
    return {
      description: firstPackageEntry.packageDescription,
      revision: firstPackageEntry.revision,
      template: {
        eyebrow: "API Reference",
        title: firstPackageEntry.packageName,
      },
    }
  }

  const modulePath = moduleSegments.join("/")
  const moduleEntry = packageEntries.find(
    (entry) => entry.modulePath === modulePath,
  )
  if (moduleEntry === undefined) return undefined
  const moduleName =
    moduleEntry.modulePath.split("/").at(-1) ?? moduleEntry.modulePath
  const isUnstable =
    moduleEntry.packageName === "effect" &&
    moduleEntry.modulePath.startsWith("unstable/")
  const description = `${isUnstable ? "Unstable " : ""}${moduleName} API reference for ${moduleEntry.packageName}.`

  return {
    description,
    revision: moduleEntry.revision,
    template: {
      eyebrow: "API Reference",
      title: moduleName,
    },
  }
}
