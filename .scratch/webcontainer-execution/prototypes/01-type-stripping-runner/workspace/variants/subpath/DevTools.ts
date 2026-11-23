import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as DevTools from "effect/devtools/DevTools"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"

export const DevToolsLayer = DevTools.layerSocket.pipe(
  Layer.provide(NodeSocket.layerNet({ port: 34437 })),
  Layer.provideMerge(
    Logger.layer([Logger.consolePretty(), Logger.tracerLogger]),
  ),
)
