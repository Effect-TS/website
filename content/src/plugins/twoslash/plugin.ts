import {
  definePlugin,
  ExpressiveCodeAnnotation,
  type AnnotationRenderOptions,
  type ExpressiveCodeBlock
} from "@expressive-code/core"
import { h } from "@expressive-code/core/hast"
import { createTwoslasher, type NodeHover, type TwoslashOptions } from "twoslash"
import ts from "typescript"
import type { CompilerOptions } from "typescript"
import FloatingToolipModule from "./twoslash-popup.js?raw"

const defaultCompilerOptions: CompilerOptions = {
  strict: true,
  target: ts.ScriptTarget.ES2022,
  exactOptionalPropertyTypes: true,
  downlevelIteration: true,
  skipLibCheck: true,
  lib: ["ES2022", "DOM", "DOM.Iterable"],
  noEmit: true
}

export interface PluginTwoslashOptions {
  /**
   * If `true`, requires `twoslash` to be present in the code block meta for
   * this transformer to be applied.
   *
   * If a `RegExp`, requires the `RegExp` to match a directive in the code 
   * block meta for this transformer to be applied.
   *
   * If `false`, this transformer will be applied to all code blocks.
   *
   * @default false
   */
  readonly explicitTrigger?: boolean | RegExp
  /**
   * The languages to apply this transformer to.
   *
   * @default ["ts", "tsx"]
  */
  readonly languages?: ReadonlyArray<string>
  /**
   * Options to forward to `twoslash`.
   *
   * @default {}
   */
  readonly twoslashOptions?: TwoslashOptions
}

export default function pluginCodeOutput(options: PluginTwoslashOptions = {}) {
  const {
    explicitTrigger = false,
    languages = ["ts", "tsx"],
    twoslashOptions
  } = options

  const twoslasher = createTwoslasher()

  const trigger = explicitTrigger instanceof RegExp
    ? explicitTrigger
    : /\btwoslash\b/

  function shouldTransform(codeBlock: ExpressiveCodeBlock) {
    return languages.includes(codeBlock.language)
      && (!explicitTrigger || trigger.test(codeBlock.meta))
  }

  return definePlugin({
    name: "@plugins/twoslash",
    jsModules: [FloatingToolipModule],
    hooks: {
      preprocessCode(context) {
        if (shouldTransform(context.codeBlock)) {
          const twoslash = twoslasher(context.codeBlock.code, context.codeBlock.language, {
            ...twoslashOptions,
            compilerOptions: {
              ...defaultCompilerOptions,
              ...(twoslashOptions?.compilerOptions ?? {})
            }
          })

          for (const hover of twoslash.hovers) {
            const line = context.codeBlock.getLine(hover.line)
            if (line) {
              line.addAnnotation(new TwoslashHoverAnnotation(hover))
            }
          }
        }
      }
    }
  })
}

class TwoslashHoverAnnotation extends ExpressiveCodeAnnotation {
  constructor(readonly hover: NodeHover) {
    super({
      inlineRange: {
        columnStart: hover.character,
        columnEnd: hover.character + hover.length
      }
    })
  }

  render({ nodesToTransform }: AnnotationRenderOptions) {
    return nodesToTransform.map((node) => {
      if (node.type === "element") {
        return h("span.twoslash", node.properties, [
          h("span.twoslash-hover", [
            h("div.twoslash-popup-container", [
              h("code.twoslash-popup-code", node.properties, [this.hover.text]),
              ...(
                this.hover.docs
                  ? [h("div.twoslash-popup-docs", [
                    h("p", [this.hover.docs])
                  ])]
                  : []
              )
            ]),
            node
          ])
        ])
      }
      return node
    })
  }
}

