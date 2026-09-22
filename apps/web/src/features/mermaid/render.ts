import { renderMermaidSVG } from "beautiful-mermaid"

export function renderMermaidDiagram(code: string): string {
  return renderMermaidSVG(code, {
    bg: "var(--background)",
    fg: "var(--prose-foreground)",
    line: "var(--muted-foreground)",
    accent: "color-mix(in srgb, var(--brand) 60%, var(--foreground))",
    muted: "var(--muted-foreground)",
    surface: "var(--card)",
    border: "var(--muted-foreground)",
    transparent: true,
    padding: 16,
  })
    .replace(/@import url\([^)]*\);/g, "")
    .replace("<svg ", "<svg data-mermaid ")
    .replace(
      "text { font-family: 'Inter', system-ui, sans-serif; }",
      "svg[data-mermaid] text { font-family: var(--font-inter), Inter, sans-serif; }",
    )
    .replace(".mono {", "svg[data-mermaid] .mono {")
    .replace("svg {", "svg[data-mermaid] {")
}
