export const ensureTitleHeading = (markdown: string, title?: string) => {
  if (!title) return markdown
  const normalizedTitle = title.trim().toLowerCase()
  if (!normalizedTitle) return markdown

  const trimmed = markdown.trimStart()
  if (trimmed.length > 0) {
    const firstLine = trimmed.split(/\r?\n/, 1)[0]
    if (firstLine) {
      const normalizedFirstLine = firstLine.replace(/^#+\s*/, "").trim().toLowerCase()
      if (firstLine.startsWith("#") && normalizedFirstLine === normalizedTitle) {
        return markdown
      }
    }
  }

  const body = trimmed.length > 0 ? `\n\n${trimmed}` : ""
  return `# ${title}${body}`
}
