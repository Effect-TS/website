import { createMarkdownProcessor } from "@astrojs/markdown-remark"
import { describe, expect, it } from "vite-plus/test"

import { remarkMermaid } from "../../../src/features/docs/remark-mermaid.js"

describe("remarkMermaid", () => {
  it("renders a Mermaid fence as an accessible SVG figure", async () => {
    const renderer = await createMarkdownProcessor({
      syntaxHighlight: false,
      remarkPlugins: [remarkMermaid],
    })

    const result = await renderer.render(
      [
        '```mermaid title="Effect.repeat control flow"',
        "flowchart TD",
        "  start([Start]) --> action[Run the action]",
        "```",
      ].join("\n"),
    )

    expect(result.code).toContain("data-mermaid-diagram")
    expect(result.code).toMatch(
      /<figcaption[^>]*>Effect\.repeat control flow<\/figcaption>/,
    )
    expect(result.code).toContain('role="img"')
    expect(result.code).toContain('aria-label="Effect.repeat control flow"')
    expect(result.code).toContain("<svg data-mermaid")
    expect(result.code).not.toContain("language-mermaid")
  })

  it("reports which Mermaid diagram could not be rendered", async () => {
    const renderer = await createMarkdownProcessor({
      syntaxHighlight: false,
      remarkPlugins: [remarkMermaid],
    })

    await expect(
      renderer.render(
        ['```mermaid title="Broken flow"', "this is not a diagram", "```"].join(
          "\n",
        ),
      ),
    ).rejects.toThrow('Failed to render Mermaid diagram "Broken flow"')
  })
})
