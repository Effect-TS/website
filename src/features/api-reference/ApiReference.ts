import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { isAbsolute, relative, resolve } from "node:path"
import { ReflectionKind, type JSONOutput } from "typedoc"
import type { ApiReferenceEntry, TypeDocProjectReflection } from "./schema"
import { TypeDocProjectReflection as TypeDocProjectReflectionSchema } from "./schema"

const defaultBaseDirectory = resolve(".data/api-reference")
export interface ApiCodeExample {
  language: "bash" | "javascript" | "json" | "typescript"
  ownerId: number
  ownerName: string
  since: string | undefined
  source: string
  sourceUrl: string | undefined
  title: string | undefined
}

export interface ApiDeclaration {
  anchor: string
  category: string
  commentHtml: string | undefined
  examples: ReadonlyArray<ApiCodeExample>
  id: number
  kind: string
  name: string
  signature: string | undefined
  since: string | undefined
  sourceUrl: string | undefined
}

export interface ApiDeclarationGroup {
  declarations: ReadonlyArray<ApiDeclaration>
  name: string
  slug: string
}

export interface ApiModule {
  commentHtml: string | undefined
  declarationCount: number
  groups: ReadonlyArray<ApiDeclarationGroup>
  since: string | undefined
  sourceUrl: string | undefined
}

export const ApiReference = {
  codeExamples,
  loadReflection,
  moduleView,
} as const

function moduleView(reflection: TypeDocProjectReflection): ApiModule {
  const moduleReflection = reflection.children?.find((child) => child.children !== undefined)
  const children = moduleReflection?.children ?? []
  const examplesByOwner = Map.groupBy(codeExamples(reflection), (example) => example.ownerId)
  const declarationCandidates = children.map((child) => {
    const comment = declarationComment(child)
    return {
      anchor: declarationAnchor(child.name),
      category: blockTagText(comment?.blockTags, "@category") ?? "Other",
      commentHtml: commentHtml(comment),
      examples: examplesByOwner.get(child.id) ?? [],
      id: child.id,
      kind: child.kind,
      name: child.name,
      signature: declarationSignature(child),
      since: blockTagText(comment?.blockTags, "@since"),
      sourceUrl: firstSourceUrl(child.sources),
    }
  })
  const anchorCounts = Map.groupBy(declarationCandidates, (declaration) => declaration.anchor)
  const declarations = declarationCandidates.map(({ kind, ...declaration }) => ({
    ...declaration,
    anchor:
      (anchorCounts.get(declaration.anchor)?.length ?? 0) > 1
        ? `${declaration.anchor}-${reflectionKindName(kind)}`
        : declaration.anchor,
    kind: titleCase(reflectionKindName(kind)),
  }))
  const groups = Map.groupBy(declarations, (declaration) => declaration.category)
  const sortedGroups = [...groups]
    .map(([name, groupedDeclarations]) => ({
      declarations: groupedDeclarations.toSorted((left, right) =>
        left.name.localeCompare(right.name),
      ),
      name: titleCase(name),
      slug: `category-${declarationAnchor(name.toLowerCase())}`,
    }))
    .toSorted((left, right) => left.name.localeCompare(right.name))
  const versions = declarations.flatMap((declaration) =>
    declaration.since === undefined ? [] : [declaration.since],
  )

  return {
    commentHtml: commentHtml(moduleReflection?.comment),
    declarationCount: declarations.length,
    groups: sortedGroups,
    since: versions.toSorted(compareVersions)[0],
    sourceUrl: declarations.find((declaration) => declaration.sourceUrl !== undefined)?.sourceUrl,
  }
}

function declarationComment(
  declaration: JSONOutput.DeclarationReflection,
): JSONOutput.Comment | undefined {
  return (
    declaration.comment ??
    declaration.signatures?.find((signature) => signature.comment !== undefined)?.comment
  )
}

function declarationAnchor(name: string): string {
  const anchor = name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "")
  return anchor.length > 0 ? anchor : "declaration"
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase())
}

function reflectionKindName(kind: number): string {
  switch (kind) {
    case ReflectionKind.Namespace:
      return "namespace"
    case ReflectionKind.Variable:
      return "variable"
    case ReflectionKind.Function:
      return "function"
    case ReflectionKind.Class:
      return "class"
    case ReflectionKind.Interface:
      return "interface"
    case ReflectionKind.TypeAlias:
      return "type"
    default:
      return `kind-${kind}`
  }
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number)
  const rightParts = right.split(".").map(Number)
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

function commentHtml(value: JSONOutput.Comment | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  const markdown = value.summary
    .flatMap((part) => {
      if (part.kind === "code" && parseFencedCode(part.text) !== undefined) return []
      return [part.text]
    })
    .join("")
    .trim()
  const withoutExample = markdown.replace(/\n\n\*\*Example\*\*[\s\S]*$/, "").trim()
  const blocks = withoutExample.split(/\n{2,}/).flatMap((block) => {
    const trimmed = block.trim()
    if (trimmed.length === 0) return []
    const heading = /^\*\*(.+)\*\*$/.exec(trimmed)
    if (heading !== null) return [`<h4>${inlineMarkup(heading[1] ?? "")}</h4>`]
    return [`<p>${inlineMarkup(trimmed.replace(/\n/g, " "))}</p>`]
  })
  const see = blockTagText(value.blockTags, "@see")
  if (see !== undefined) {
    const items = see
      .split(/\n\s*-\s*/)
      .map((item) => item.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean)
    if (items.length > 0) {
      blocks.push(
        "<h4>See</h4>",
        `<ul>${items.map((item) => `<li>${linkFirstWord(item)}</li>`).join("")}</ul>`,
      )
    }
  }
  return blocks.length > 0 ? blocks.join("") : undefined
}

function inlineMarkup(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
}

function linkFirstWord(value: string): string {
  const match = /^(\w+)([\s\S]*)$/.exec(value)
  return match === null
    ? inlineMarkup(value)
    : `<a href="#${declarationAnchor(match[1] ?? "")}"><code>${escapeHtml(match[1] ?? "")}</code></a>${inlineMarkup(match[2] ?? "")}`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function declarationSignature(declaration: JSONOutput.DeclarationReflection): string | undefined {
  const typeParameters = formatTypeParameters(declaration.typeParameters)

  switch (declaration.kind) {
    case ReflectionKind.Function:
      return declaration.signatures
        ?.map(
          (signature) =>
            `declare function ${declaration.name}${formatDeclarationSignature(signature)}`,
        )
        .join("\n")
    case ReflectionKind.Variable:
      return declaration.type === undefined
        ? undefined
        : `declare const ${declaration.name}: ${formatType(declaration.type)}`
    case ReflectionKind.Interface: {
      const extended = formatHeritageClause("extends", declaration.extendedTypes)
      return `interface ${declaration.name}${typeParameters}${extended} ${formatObjectBody(declaration)}`
    }
    case ReflectionKind.Class: {
      const extended = formatHeritageClause("extends", declaration.extendedTypes)
      const implemented = formatHeritageClause("implements", declaration.implementedTypes)
      return `declare class ${declaration.name}${typeParameters}${extended}${implemented} ${formatObjectBody(declaration)}`
    }
    case ReflectionKind.TypeAlias:
      if (declaration.type !== undefined) {
        return `type ${declaration.name}${typeParameters} = ${formatType(declaration.type)}`
      }
      return `type ${declaration.name}${typeParameters} = ${formatObjectBody(declaration)}`
    default:
      return undefined
  }
}

function formatDeclarationSignature(signature: JSONOutput.SignatureReflection): string {
  return `${formatSignatureHead(signature)}: ${formatType(signature.type)}`
}

function formatFunctionType(signature: JSONOutput.SignatureReflection): string {
  return `${formatSignatureHead(signature)} => ${formatType(signature.type)}`
}

function formatSignatureHead(signature: JSONOutput.SignatureReflection): string {
  const parameters = signature.parameters ?? []
  const args = parameters.map(formatParameter).join(", ")
  return `${formatTypeParameters(signature.typeParameters)}(${args})`
}

function formatParameter(parameter: JSONOutput.ParameterReflection): string {
  const rest = parameter.flags.isRest === true ? "..." : ""
  const optional = parameter.flags.isOptional === true && rest.length === 0 ? "?" : ""
  return `${rest}${parameter.name}${optional}: ${formatType(parameter.type)}`
}

function formatTypeParameters(
  parameters: ReadonlyArray<JSONOutput.TypeParameterReflection> | undefined,
): string {
  return parameters === undefined || parameters.length === 0
    ? ""
    : `<${parameters.map(formatTypeParameter).join(", ")}>`
}

function formatTypeParameter(parameter: JSONOutput.TypeParameterReflection): string {
  const variance = parameter.varianceModifier === undefined ? "" : `${parameter.varianceModifier} `
  const constraint = parameter.type === undefined ? "" : ` extends ${formatType(parameter.type)}`
  const defaultType = parameter.default === undefined ? "" : ` = ${formatType(parameter.default)}`
  return `${variance}${parameter.name}${constraint}${defaultType}`
}

function formatHeritageClause(
  keyword: "extends" | "implements",
  types: ReadonlyArray<JSONOutput.SomeType> | undefined,
): string {
  return types === undefined || types.length === 0
    ? ""
    : ` ${keyword} ${types.map((type) => formatType(type)).join(", ")}`
}

function formatObjectBody(declaration: JSONOutput.DeclarationReflection, depth = 0): string {
  const members = [
    ...(declaration.signatures ?? []).map(
      (signature) => `${formatDeclarationSignature(signature)};`,
    ),
    ...(declaration.indexSignatures ?? []).map(formatIndexSignature),
    ...(declaration.children ?? [])
      .filter((child) => child.flags.isInherited !== true)
      .flatMap(formatMember),
  ]
  if (members.length === 0 || depth > 12) return "{}"
  return `{\n${members.map((member) => indent(member)).join("\n")}\n}`
}

function formatIndexSignature(signature: JSONOutput.SignatureReflection): string {
  const parameters = signature.parameters ?? []
  return `[${parameters.map(formatParameter).join(", ")}]: ${formatType(signature.type)};`
}

function formatMember(member: JSONOutput.DeclarationReflection): ReadonlyArray<string> {
  const optional = member.flags.isOptional === true ? "?" : ""
  const readonly = member.flags.isReadonly === true ? "readonly " : ""
  const staticModifier = member.flags.isStatic === true ? "static " : ""
  const abstract = member.flags.isAbstract === true ? "abstract " : ""
  const modifiers = `${abstract}${staticModifier}`

  switch (member.kind) {
    case ReflectionKind.Constructor:
      return (member.signatures ?? []).map(
        (signature) => `constructor${formatSignatureHead(signature)};`,
      )
    case ReflectionKind.Method:
      return (member.signatures ?? []).map(
        (signature) =>
          `${modifiers}${member.name}${optional}${formatDeclarationSignature(signature)};`,
      )
    case ReflectionKind.Accessor: {
      const type = member.getSignature?.type ?? member.setSignature?.parameters?.[0]?.type
      return [`${modifiers}${readonly}${member.name}${optional}: ${formatType(type)};`]
    }
    default:
      if (member.type !== undefined) {
        return [`${modifiers}${readonly}${member.name}${optional}: ${formatType(member.type)};`]
      }
      return []
  }
}

function indent(value: string): string {
  return value
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n")
}

function formatType(value: JSONOutput.SomeType | undefined, depth = 0): string {
  if (value === undefined || depth > 12) return "unknown"
  switch (value.type) {
    case "intrinsic":
    case "unknown":
      return value.name
    case "reference": {
      const args = value.typeArguments ?? []
      return args.length === 0
        ? value.name
        : `${value.name}<${args.map((argument) => formatType(argument, depth + 1)).join(", ")}>`
    }
    case "union":
    case "intersection":
      return value.types
        .map((member) => formatType(member, depth + 1))
        .join(value.type === "union" ? " | " : " & ")
    case "array":
      return `Array<${formatType(value.elementType, depth + 1)}>`
    case "tuple":
      return `[${(value.elements ?? []).map((element) => formatType(element, depth + 1)).join(", ")}]`
    case "namedTupleMember":
      return `${value.name}${value.isOptional ? "?" : ""}: ${formatType(value.element, depth + 1)}`
    case "literal":
      return typeof value.value === "string" ? JSON.stringify(value.value) : String(value.value)
    case "typeOperator":
      return `${value.operator} ${formatType(value.target, depth + 1)}`
    case "indexedAccess":
      return `${formatType(value.objectType, depth + 1)}[${formatType(value.indexType, depth + 1)}]`
    case "query":
      return `typeof ${formatType(value.queryType, depth + 1)}`
    case "reflection": {
      const signatures = value.declaration.signatures ?? []
      const children = value.declaration.children ?? []
      const indexSignatures = value.declaration.indexSignatures ?? []
      if (signatures.length === 1 && children.length === 0 && indexSignatures.length === 0) {
        const signature = signatures[0]
        return signature === undefined ? "unknown" : formatFunctionType(signature)
      }
      return formatObjectBody(value.declaration, depth + 1)
    }
    case "optional":
      return `${formatType(value.elementType, depth + 1)}?`
    case "rest":
      return `...${formatType(value.elementType, depth + 1)}`
    case "conditional":
      return `${formatType(value.checkType, depth + 1)} extends ${formatType(value.extendsType, depth + 1)} ? ${formatType(value.trueType, depth + 1)} : ${formatType(value.falseType, depth + 1)}`
    case "inferred":
      return `infer ${value.name}${value.constraint === undefined ? "" : ` extends ${formatType(value.constraint, depth + 1)}`}`
    case "predicate":
      return `${value.asserts ? "asserts " : ""}${value.name}${value.targetType === undefined ? "" : ` is ${formatType(value.targetType, depth + 1)}`}`
    case "templateLiteral":
      return `\`${value.head}${value.tail.map(([type, text]) => `\${${formatType(type, depth + 1)}}${text}`).join("")}\``
    case "mapped":
      return `{ [${value.parameter} in ${formatType(value.parameterType, depth + 1)}]: ${formatType(value.templateType, depth + 1)} }`
  }
}

function codeExamples(reflection: TypeDocProjectReflection): ReadonlyArray<ApiCodeExample> {
  const examples: Array<ApiCodeExample> = []
  visitReflection(reflection, examples)
  return examples
}

function visitReflection(
  reflection: JSONOutput.SomeReflection,
  examples: Array<ApiCodeExample>,
): void {
  examples.push(...reflectionExamples(reflection))
  for (const child of reflectionChildren(reflection)) {
    visitReflection(child, examples)
  }
}

function reflectionChildren(
  reflection: JSONOutput.SomeReflection,
): ReadonlyArray<JSONOutput.SomeReflection> {
  const children: Array<JSONOutput.SomeReflection> = []
  if ("children" in reflection && reflection.children !== undefined) {
    children.push(...reflection.children)
  }
  if ("signatures" in reflection && reflection.signatures !== undefined) {
    children.push(...reflection.signatures)
  }
  if ("indexSignatures" in reflection && reflection.indexSignatures !== undefined) {
    children.push(...reflection.indexSignatures)
  }
  if ("parameters" in reflection && reflection.parameters !== undefined) {
    children.push(...reflection.parameters)
  }
  if ("typeParameters" in reflection && reflection.typeParameters !== undefined) {
    children.push(...reflection.typeParameters)
  }
  if ("getSignature" in reflection && reflection.getSignature !== undefined) {
    children.push(reflection.getSignature)
  }
  if ("setSignature" in reflection && reflection.setSignature !== undefined) {
    children.push(reflection.setSignature)
  }
  return children
}

function reflectionExamples(reflection: JSONOutput.SomeReflection): ReadonlyArray<ApiCodeExample> {
  const comment = reflection.comment
  if (comment === undefined) {
    return []
  }

  const since = blockTagText(comment.blockTags, "@since")
  const sourceUrl = "sources" in reflection ? firstSourceUrl(reflection.sources) : undefined
  const parts = comment.summary
  const examples: Array<ApiCodeExample> = []

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    if (part === undefined || part.kind !== "code") {
      continue
    }
    const fencedCode = parseFencedCode(part.text)
    if (fencedCode === undefined) {
      continue
    }

    examples.push({
      ...fencedCode,
      ownerId: reflection.id,
      ownerName: reflection.name,
      since,
      sourceUrl,
      title: exampleTitle(parts.slice(0, index)),
    })
  }

  if (comment.blockTags !== undefined) {
    for (const tag of comment.blockTags) {
      if (tag.tag !== "@example") {
        continue
      }
      for (const part of tag.content) {
        if (part.kind !== "code") {
          continue
        }
        const fencedCode = parseFencedCode(part.text)
        if (fencedCode !== undefined) {
          examples.push({
            ...fencedCode,
            ownerId: reflection.id,
            ownerName: reflection.name,
            since,
            sourceUrl,
            title: undefined,
          })
        }
      }
    }
  }

  return examples
}

function parseFencedCode(value: string): Pick<ApiCodeExample, "language" | "source"> | undefined {
  const match = /^```([^\n]*)\n([\s\S]*?)\n```\s*$/.exec(value)
  if (match === null) {
    return undefined
  }

  const language = normalizeLanguage((match[1] ?? "").trim())
  const source = match[2]
  return language === undefined || source === undefined ? undefined : { language, source }
}

function normalizeLanguage(value: string): ApiCodeExample["language"] | undefined {
  switch (value) {
    case "bash":
    case "json":
      return value
    case "js":
    case "javascript":
      return "javascript"
    case "":
    case "ts":
    case "typescript":
      return "typescript"
    default:
      return undefined
  }
}

function exampleTitle(parts: ReadonlyArray<JSONOutput.CommentDisplayPart>): string | undefined {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index]
    if (part === undefined || part.kind !== "text") {
      continue
    }
    const match = /\*\*Example\*\*(?:\s*\(([^)]+)\))?[^]*$/.exec(part.text)
    if (match !== null) {
      return match[1]
    }
  }
  return undefined
}

function blockTagText(
  value: ReadonlyArray<JSONOutput.CommentTag> | undefined,
  tagName: string,
): string | undefined {
  const tag = value?.find((candidate) => candidate.tag === tagName)
  if (tag === undefined) {
    return undefined
  }
  const text = tag.content
    .map((part) => part.text)
    .join("")
    .trim()
  return text.length > 0 ? text : undefined
}

function firstSourceUrl(
  value: ReadonlyArray<JSONOutput.SourceReference> | undefined,
): string | undefined {
  return value?.find((source) => source.url !== undefined)?.url
}

export async function loadReflection(
  entry: ApiReferenceEntry,
  options?: { baseDirectory?: string },
): Promise<TypeDocProjectReflection> {
  const baseDirectory = resolve(options?.baseDirectory ?? defaultBaseDirectory)
  const reflectionPath = resolve(baseDirectory, entry.reflectionPath)
  const relativePath = relative(baseDirectory, reflectionPath)
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`API reflection path escapes its dataset: ${entry.reflectionPath}`)
  }

  const contents = await readFile(reflectionPath)
  const digest = createHash("sha256").update(contents).digest("hex")
  if (digest !== entry.reflectionDigest) {
    throw new Error(
      `API reflection checksum mismatch for ${entry.version}/${entry.packageSlug}/${entry.modulePath}: expected ${entry.reflectionDigest}, received ${digest}`,
    )
  }

  return TypeDocProjectReflectionSchema.parse(JSON.parse(contents.toString("utf8")))
}
