// Build-time markdown bundling for PageTitle copy functionality
// This avoids runtime file I/O by importing all markdown content at build time

// Import all markdown files as raw strings
const markdownFiles = import.meta.glob('/src/content/**/*.{md,mdx}', {
  eager: true,
  as: 'raw'
}) as Record<string, string>

/**
 * Strip YAML frontmatter from markdown content
 * Frontmatter is the metadata between --- lines at the start of files
 */
function stripFrontmatter(content: string): string {
  // Match frontmatter pattern: starts with ---, has content, ends with ---
  const frontmatterRegex = /^---\s*\r?\n(.*?)\r?\n---\s*\r?\n/s
  return content.replace(frontmatterRegex, '')
}

/**
 * Get the raw markdown content for a Starlight entry ID
 * Maps Starlight's route ID format to actual file paths and strips frontmatter
 */
export function getMarkdownById(entryId: string): string | undefined {
  // Remove leading slash if present
  const normalizedId = entryId.replace(/^\//, '')

  // Try different path patterns that match Starlight's routing
  const candidates = [
    `/src/content/docs/${normalizedId}.md`,
    `/src/content/docs/${normalizedId}.mdx`,
    `/src/content/${normalizedId}.md`,
    `/src/content/${normalizedId}.mdx`,
    // Handle index files
    `/src/content/docs/${normalizedId}/index.md`,
    `/src/content/docs/${normalizedId}/index.mdx`,
  ]

  for (const candidatePath of candidates) {
    const content = markdownFiles[candidatePath]
    if (content) {
      // Strip frontmatter before returning
      return stripFrontmatter(content)
    }
  }

  // Debug: log available files if we can't find a match
  if (import.meta.env.DEV) {
    console.warn(`No markdown found for entry ID: ${entryId}`)
    console.warn('Available files:', Object.keys(markdownFiles).slice(0, 10))
  }

  return undefined
}

/**
 * Get all available markdown file paths (for debugging)
 */
export function getAvailablePaths(): string[] {
  return Object.keys(markdownFiles)
}