import * as Data from "effect/Data"
import type { CSSProperties } from "react"

export class MetadataNotFound extends Data.TaggedError("MetadataNotFound")<{
  readonly slug: string
}> {}

export type OpenGraphContent = Data.TaggedEnum<{
  readonly Docs: {
    readonly props: {
      readonly title: string
      readonly subtitle?: string | undefined
    }
  }
  readonly Blog: {
    readonly props: {
      readonly title: string
      readonly subtitle?: string | undefined
    }
  }
  readonly Api: {
    readonly props: {
      readonly eyebrow: string
      readonly title: string
    }
  }
}>
export const OpenGraphContent = Data.taggedEnum<OpenGraphContent>()

export type OpenGraphChild = OpenGraphNode | string | number | null
export type OpenGraphChildren = OpenGraphChild | ReadonlyArray<OpenGraphChild>

export interface OpenGraphNodeProps {
  readonly style?: CSSProperties
  readonly children?: OpenGraphChildren
  readonly src?: string
  readonly width?: number
  readonly height?: number
}

export interface OpenGraphNode {
  readonly type: string
  readonly key: string | null
  readonly props: OpenGraphNodeProps
}

export type OpenGraphFontWeight = 400 | 700

export type OpenGraphFontDefinition = OpenGraphSansFont | OpenGraphMonoFont

export interface OpenGraphSansFont {
  readonly cssVariable: "--font-og-inter"
  readonly name: "Inter"
  readonly weight: OpenGraphFontWeight
}

export interface OpenGraphMonoFont {
  readonly cssVariable: "--font-og-jetbrains-mono"
  readonly name: "JetBrains Mono"
  readonly weight: OpenGraphFontWeight
}
