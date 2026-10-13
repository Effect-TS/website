export const API_SECTION_HEADING_CLASS =
  "mt-6 mb-2 font-mono text-[12px]! leading-normal! font-medium tracking-wider text-muted-foreground uppercase"

const BOLD_ONLY_PARAGRAPH = /<p><strong>([^<]+)<\/strong><\/p>/g
const SECTION_HEADING = /<h4[\s>]/

/**
 * Splits rendered JSDoc HTML into the opening summary and the titled sections
 * that follow it. Bold-only paragraphs and `<h4>` elements become real
 * headings that share the declaration's section-heading style.
 */
export const splitComment = (
  html: string,
): { summary: string; sections: string } => {
  const normalized = html
    .replace(BOLD_ONLY_PARAGRAPH, "<h4>$1</h4>")
    .replaceAll("<h4>", `<h4 class="${API_SECTION_HEADING_CLASS}">`)
  const index = normalized.search(SECTION_HEADING)
  return index === -1
    ? { summary: normalized, sections: "" }
    : { summary: normalized.slice(0, index), sections: normalized.slice(index) }
}
