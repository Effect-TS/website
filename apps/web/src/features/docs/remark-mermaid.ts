import type { Node, RemarkPlugin } from "@astrojs/markdown-remark"
import { renderMermaidDiagram } from "../mermaid/render.js"

interface MarkdownNode extends Node {
  children?: Array<Node> | undefined
  lang?: string | null | undefined
  meta?: string | null | undefined
  value?: string | undefined
}

export const remarkMermaid: RemarkPlugin = () => (tree) => {
  transformMermaidFences(tree)
}

function transformMermaidFences(node: Node): void {
  const markdownNode = node as MarkdownNode

  if (markdownNode.type === "code" && markdownNode.lang === "mermaid") {
    const title = readTitle(markdownNode.meta)
    if (title === undefined) {
      throw new Error(
        'Mermaid code blocks require a quoted title, for example title="Request flow"',
      )
    }

    markdownNode.type = "html"
    markdownNode.value = renderFigure(markdownNode.value ?? "", title)
    delete markdownNode.lang
    delete markdownNode.meta
    return
  }

  markdownNode.children?.forEach(transformMermaidFences)
}

function readTitle(meta: string | null | undefined): string | undefined {
  const match = /(?:^|\s)title=(?:"([^"]+)"|'([^']+)')(?=\s|$)/.exec(meta ?? "")
  return match?.[1] ?? match?.[2]
}

function renderFigure(code: string, title: string): string {
  const escapedTitle = escapeHtml(title)
  let svg: string
  try {
    svg = renderMermaidDiagram(code)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`Failed to render Mermaid diagram "${title}": ${message}`, {
      cause,
    })
  }

  return [
    '<figure data-mermaid-diagram class="not-prose my-10 overflow-hidden rounded-lg border border-border bg-card/60">',
    `  <figcaption class="border-b border-border px-5 py-4 text-sm font-medium text-foreground">${escapedTitle}</figcaption>`,
    `  <div role="img" aria-label="${escapedTitle}" class="overflow-x-auto p-4 [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-w-full">`,
    svg,
    "  </div>",
    "</figure>",
  ].join("\n")
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}
