// Build-time markdown bundling for PageTitle copy functionality
// This avoids runtime file I/O by importing all markdown content at build time

import { ensureTitleHeading } from "./markdown-heading"

// Import all markdown files as raw strings
const markdownFiles = import.meta.glob("/src/content/**/*.{md,mdx}", {
  eager: true,
  as: "raw"
}) as Record<string, string>

const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/

const splitFrontmatter = (content: string) => {
  const match = frontmatterRegex.exec(content)
  if (!match) {
    return { markdown: content, frontmatter: undefined }
  }

  const [fullMatch, frontmatter] = match
  const markdown = content.slice(fullMatch.length)
  return { markdown, frontmatter }
}

const stripWrappingQuotes = (value: string) => value.replace(/^['"]+|['"]+$/g, "").trim()

const extractTitle = (frontmatter?: string): string | undefined => {
  if (!frontmatter) return undefined

  const lines = frontmatter.split(/\r?\n/)
  for (const line of lines) {
    const match = /^title\s*:\s*(.+)$/i.exec(line.trim())
    if (match?.[1]) {
      return stripWrappingQuotes(match[1].trim())
    }
  }

  return undefined
}

/**
 * Get the raw markdown content for a Starlight entry ID
 * Maps Starlight's route ID format to actual file paths and strips frontmatter
 */
export function getMarkdownById(entryId: string): string | undefined {
  // Remove leading slash if present
  const normalizedId = entryId.replace(/^\//, "")

  // Try different path patterns that match Starlight's routing
  const candidates = [
    `/src/content/docs/${normalizedId}.md`,
    `/src/content/docs/${normalizedId}.mdx`,
    `/src/content/${normalizedId}.md`,
    `/src/content/${normalizedId}.mdx`,
    // Handle index files
    `/src/content/docs/${normalizedId}/index.md`,
    `/src/content/docs/${normalizedId}/index.mdx`
  ]

  for (const candidatePath of candidates) {
    const content = markdownFiles[candidatePath]
    if (content) {
      const { markdown, frontmatter } = splitFrontmatter(content)
      const title = extractTitle(frontmatter)
      return ensureTitleHeading(markdown, title)
    }
  }

  // Debug: log available files if we can't find a match
  if (import.meta.env.DEV) {
    console.warn(`No markdown found for entry ID: ${entryId}`)
    console.warn("Available files:", Object.keys(markdownFiles).slice(0, 10))
  }

  return undefined
}

/**
 * Get all available markdown file paths (for debugging)
 */
export function getAvailablePaths(): string[] {
  return Object.keys(markdownFiles)
}
