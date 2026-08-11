import { Layer } from "effect"
import { OpenGraph } from "./Application"
import { OgContentLive } from "./ContentLive"
import { OgRendererLive } from "./RendererLive"

export const OpenGraphLive = OpenGraph.layer.pipe(
  Layer.provide(OgContentLive),
  Layer.provide(OgRendererLive),
)
