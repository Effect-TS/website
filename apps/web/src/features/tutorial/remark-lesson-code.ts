import type { Node, RemarkPlugin } from "@astrojs/markdown-remark"

interface CodeNode extends Node {
  children?: Array<Node> | undefined
  meta?: string | null | undefined
}

const LESSON_FILE = /[\\/]content[\\/]tutorial[\\/]/

/** Lesson prose shows short snippets: no line numbers. */
export const remarkLessonCode: RemarkPlugin = () => (tree, file) => {
  if (!LESSON_FILE.test(file.path ?? "")) return
  const visit = (node: CodeNode): void => {
    if (node.type === "code" && !node.meta?.includes("showLineNumbers")) {
      node.meta = `${node.meta ?? ""} showLineNumbers=false`.trim()
    }
    node.children?.forEach(visit)
  }
  visit(tree as CodeNode)
}
