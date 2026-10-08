import { assert, test } from "vite-plus/test"
import { splitComment } from "../../../src/features/api-reference/comment-sections.ts"

test("keeps a comment without sections as the summary", () => {
  assert.deepEqual(splitComment("<p>Runs it.</p>"), {
    summary: "<p>Runs it.</p>",
    sections: "",
  })
})

test("turns bold-only paragraphs into headings and splits at the first one", () => {
  const { summary, sections } = splitComment(
    "<p>Runs it.</p><p><strong>When to use</strong></p><p>Often.</p><h4>See</h4><ul></ul>",
  )
  assert.equal(summary, "<p>Runs it.</p>")
  assert.match(
    sections,
    /^<h4 class="[^"]+">When to use<\/h4><p>Often\.<\/p><h4 class="[^"]+">See<\/h4>/,
  )
})

test("leaves inline bold text alone", () => {
  const html = "<p>Use <strong>carefully</strong>.</p>"
  assert.deepEqual(splitComment(html), { summary: html, sections: "" })
})
