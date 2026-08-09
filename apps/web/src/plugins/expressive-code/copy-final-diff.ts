import type { ExpressiveCodePlugin } from "@expressive-code/core"
import { select, setProperty } from "@expressive-code/core/hast"

interface TextMarkerAnnotation {
  readonly markerType?: string
}

export function pluginCopyFinalDiff(): ExpressiveCodePlugin {
  return {
    name: "CopyFinalDiff",
    hooks: {
      postprocessRenderedBlock({ codeBlock, renderData }) {
        if (!codeBlock.metaOptions.getBoolean("copyFinal")) {
          return
        }

        const finalCode = codeBlock
          .getLines()
          .filter((line) =>
            line
              .getAnnotations()
              .every(
                (annotation) =>
                  (annotation as TextMarkerAnnotation).markerType !== "del",
              ),
          )
          .map((line) => line.text)
          .join("\n")
          .replace(/\n/g, "\x7f")

        const copyButton = select(".copy button", renderData.blockAst)
        if (!copyButton) {
          throw new Error("Unable to find the copy button for the code frame")
        }
        setProperty(copyButton, "dataCode", finalCode)
      },
    },
  }
}
