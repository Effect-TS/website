import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { ApiReferenceEntry, TypeDocProjectReflection } from "./schema";
import { TypeDocProjectReflection as TypeDocProjectReflectionSchema } from "./schema";

const defaultBaseDirectory = resolve(".data/api-reference");
const reflectionChildKeys = [
  "children",
  "signatures",
  "getSignature",
  "setSignature",
  "indexSignature",
];

export interface ApiCodeExample {
  language: "bash" | "javascript" | "json" | "typescript";
  ownerId: number;
  ownerName: string;
  since: string | undefined;
  source: string;
  sourceUrl: string | undefined;
  title: string | undefined;
}

export const ApiReference = {
  codeExamples,
  loadReflection,
} as const;

function codeExamples(
  reflection: TypeDocProjectReflection,
): ReadonlyArray<ApiCodeExample> {
  const examples: Array<ApiCodeExample> = [];
  visitReflection(reflection, examples);
  return examples;
}

function visitReflection(
  value: unknown,
  examples: Array<ApiCodeExample>,
): void {
  if (!isRecord(value)) {
    return;
  }

  const ownerId = value.id;
  const ownerName = value.name;
  if (typeof ownerId === "number" && typeof ownerName === "string") {
    examples.push(...reflectionExamples(value, ownerId, ownerName));
  }

  for (const key of reflectionChildKeys) {
    const children = value[key];
    if (Array.isArray(children)) {
      for (const child of children) {
        visitReflection(child, examples);
      }
    } else {
      visitReflection(children, examples);
    }
  }
}

function reflectionExamples(
  reflection: Record<string, unknown>,
  ownerId: number,
  ownerName: string,
): ReadonlyArray<ApiCodeExample> {
  const comment = reflection.comment;
  if (!isRecord(comment)) {
    return [];
  }

  const since = blockTagText(comment.blockTags, "@since");
  const sourceUrl = firstSourceUrl(reflection.sources);
  const parts = Array.isArray(comment.summary) ? comment.summary : [];
  const examples: Array<ApiCodeExample> = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (
      !isRecord(part) ||
      part.kind !== "code" ||
      typeof part.text !== "string"
    ) {
      continue;
    }
    const fencedCode = parseFencedCode(part.text);
    if (fencedCode === undefined) {
      continue;
    }

    examples.push({
      ...fencedCode,
      ownerId,
      ownerName,
      since,
      sourceUrl,
      title: exampleTitle(parts.slice(0, index)),
    });
  }

  if (Array.isArray(comment.blockTags)) {
    for (const tag of comment.blockTags) {
      if (
        !isRecord(tag) ||
        tag.tag !== "@example" ||
        !Array.isArray(tag.content)
      ) {
        continue;
      }
      for (const part of tag.content) {
        if (
          !isRecord(part) ||
          part.kind !== "code" ||
          typeof part.text !== "string"
        ) {
          continue;
        }
        const fencedCode = parseFencedCode(part.text);
        if (fencedCode !== undefined) {
          examples.push({
            ...fencedCode,
            ownerId,
            ownerName,
            since,
            sourceUrl,
            title: undefined,
          });
        }
      }
    }
  }

  return examples;
}

function parseFencedCode(
  value: string,
): Pick<ApiCodeExample, "language" | "source"> | undefined {
  const match = /^```([^\n]*)\n([\s\S]*?)\n```\s*$/.exec(value);
  if (match === null) {
    return undefined;
  }

  const language = normalizeLanguage((match[1] ?? "").trim());
  const source = match[2];
  return language === undefined || source === undefined
    ? undefined
    : { language, source };
}

function normalizeLanguage(
  value: string,
): ApiCodeExample["language"] | undefined {
  switch (value) {
    case "bash":
    case "json":
      return value;
    case "js":
    case "javascript":
      return "javascript";
    case "":
    case "ts":
    case "typescript":
      return "typescript";
    default:
      return undefined;
  }
}

function exampleTitle(parts: ReadonlyArray<unknown>): string | undefined {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if (
      !isRecord(part) ||
      part.kind !== "text" ||
      typeof part.text !== "string"
    ) {
      continue;
    }
    const match = /\*\*Example\*\*(?:\s*\(([^)]+)\))?[^]*$/.exec(part.text);
    if (match !== null) {
      return match[1];
    }
  }
  return undefined;
}

function blockTagText(value: unknown, tagName: string): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const tag = value.find(
    (candidate) => isRecord(candidate) && candidate.tag === tagName,
  );
  if (!isRecord(tag) || !Array.isArray(tag.content)) {
    return undefined;
  }
  const text = tag.content
    .flatMap((part) =>
      isRecord(part) && typeof part.text === "string" ? [part.text] : [],
    )
    .join("")
    .trim();
  return text.length > 0 ? text : undefined;
}

function firstSourceUrl(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const source = value.find(isRecord);
  return typeof source?.url === "string" ? source.url : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function loadReflection(
  entry: ApiReferenceEntry,
  options?: { baseDirectory?: string },
): Promise<TypeDocProjectReflection> {
  const baseDirectory = resolve(options?.baseDirectory ?? defaultBaseDirectory);
  const reflectionPath = resolve(baseDirectory, entry.reflectionPath);
  const relativePath = relative(baseDirectory, reflectionPath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(
      `API reflection path escapes its dataset: ${entry.reflectionPath}`,
    );
  }

  const contents = await readFile(reflectionPath);
  const digest = createHash("sha256").update(contents).digest("hex");
  if (digest !== entry.reflectionDigest) {
    throw new Error(
      `API reflection checksum mismatch for ${entry.version}/${entry.packageSlug}/${entry.modulePath}: expected ${entry.reflectionDigest}, received ${digest}`,
    );
  }

  return TypeDocProjectReflectionSchema.parse(
    JSON.parse(contents.toString("utf8")),
  );
}
