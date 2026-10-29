import { assert, describe, test } from "vite-plus/test"
import { renderChangelogHtml } from "../../../src/features/changelog/html.ts"

describe("renderChangelogHtml", () => {
  test("renders Markdown, collapses dependency commit lists and keeps raw HTML as text", () => {
    const html = renderChangelogHtml(
      [
        "### Patch Changes",
        "",
        "- Fix `run`.<script>alert(1)</script> for Effect<A, E>",
        "- Updated dependencies [[`abc1234`](https://example.com/abc1234)]:",
        "  - effect@4.0.1",
      ].join("\n"),
    )
    assert.include(html, 'id="patch-changes"')
    assert.include(html, 'class="heading-permalink"')
    assert.include(html, 'href="#patch-changes"')
    assert.include(html, "Patch Changes")
    assert.include(html, "<code>run</code>")
    assert.include(html, "Updated dependencies:")
    assert.notInclude(html, "abc1234")
    assert.notInclude(html, "<script>")
    assert.include(html, "&#x3C;script>")
    assert.include(html, "Effect&#x3C;A, E>")
    assert.include(renderChangelogHtml("a<br/>b"), "<br>")
  })

  test("returns the same HTML when a body repeats", () => {
    const body =
      "### Patch Changes\n\n- Updated dependencies [[`a1`](https://x.test)]:\n  - effect@4.0.1"
    assert.strictEqual(renderChangelogHtml(body), renderChangelogHtml(body))
    // Bodies that only differ in commit links render alike.
    assert.strictEqual(
      renderChangelogHtml(body),
      renderChangelogHtml(body.replace("a1", "b2")),
    )
  })
})

describe("renderChangelogHtml heading ids", () => {
  test("scopes ids and permalinks to the release", () => {
    const html = renderChangelogHtml("### Patch Changes\n\n- Fix.", {
      idPrefix: "4.0.0-rc.1",
    })
    assert.include(html, 'id="4-0-0-rc-1-patch-changes"')
    assert.include(html, 'href="#4-0-0-rc-1-patch-changes"')
  })
})
