import type { ExpressiveCodePlugin } from "@expressive-code/core"
import { selectAll } from "@expressive-code/core/hast"

export function pluginTwoslashPagefind(): ExpressiveCodePlugin {
  return {
    name: "TwoslashPagefind",
    hooks: {
      postprocessRenderedBlock({ codeBlock, renderData }) {
        const isTS = codeBlock.language === "ts"
        const hasTwoslash = /\btwoslash\b/.test(codeBlock.meta)
        if (isTS && hasTwoslash) {
          const elements = selectAll("div.twoslash-popup-container", renderData.blockAst)
          for (const element of elements) {
            element.properties["data-pagefind-ignore"] = true
          }
        }
      }
    }
  }
}
