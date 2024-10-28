import { definePlugin } from "@expressive-code/core";
import { h, select, } from "@expressive-code/core/hast";

export interface PluginCodeOuptutProps {
  outputRange: PluginCodeOutputRange
}

export interface PluginCodeOutputRange {
  readonly start: number
  readonly end: number
}

declare module "@expressive-code/core" {
  export interface ExpressiveCodeBlockProps extends PluginCodeOuptutProps { }
}

const CODE_RANGE_REGEX = /^(?:(?:(?<start>\d+)(?<dash>-)?)?(?<end>\d+)?)$/
const LINE_REPLACE_REGEX = /^\s*\/\/\s*|^\/\*\s*$|^\*\/\s*$/

export default function pluginCodeOutput() {
  return definePlugin({
    name: "@plugins/code-output",
    baseStyles: `
      .header.code-output {
        justify-content: flex-start !important;
        padding-inline-start: calc(var(--ecIndent, 0ch) + var(--ec-codePadInl) - var(--ec-gtrBrdWd));
      }

      .header.code-output::before {
        display: none; 
      }
    `,
    hooks: {
      preprocessMetadata(context) {
        const codeBlock = context.codeBlock
        const range = codeBlock.metaOptions.getRange("output")

        if (range !== undefined) {
          const parsedRange = CODE_RANGE_REGEX.exec(range)

          if (!parsedRange || !parsedRange.groups) {
            throw new Error(`Received invalid output range: ${range}`)
          }

          const codeLines = codeBlock.getLines()

          const start = parsedRange.groups.start
            ? Number.parseInt(parsedRange.groups.start, 10)
            : 1

          const hasDash = parsedRange.groups.dash || start === undefined

          const end = !hasDash
            ? start
            : parsedRange.groups.end
              ? Number.parseInt(parsedRange.groups.end, 10)
              : codeLines.length

          codeBlock.props.outputRange = { start: start, end: end }
        }
      },
      preprocessCode(context) {
        const codeBlock = context.codeBlock
        const range = codeBlock.props.outputRange

        if (range !== undefined) {
          for (let index = range.start - 1; index <= range.end; index++) {
            const line = codeBlock.getLine(index)

            if (line === undefined) continue

            const text = line.text.replace(LINE_REPLACE_REGEX, "")

            codeBlock.deleteLine(index)

            if (text.length > 0) {
              codeBlock.insertLine(index, text)
            }
          }
        }
      },
      postprocessRenderedBlockGroup(context) {
        const group = context.renderedGroupContents.find((group) => group.codeBlock.props.outputRange !== undefined)
        if (group) {
          const range = group.codeBlock.props.outputRange!
          const code = select("figure > pre > code", group.renderedBlockAst)
          const children = code?.children.splice(range.start - 1, range.end) ?? []
          const outputFigure = h("figure.frame.is-terminal.not-content", { title: "output" }, [
            h("figcaption.header.code-output", [
              h("span.title", "Output"),
              h("span.sr-only", "Terminal Output Window")
            ]),
            h("pre", { dataLanguage: "sh" }, [
              h("code", children)
            ])
          ])
          context.renderData.groupAst.children.push(outputFigure)
        }
      }
    }
  })
}

