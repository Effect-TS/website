// Serves the API on http://localhost:3000, with its documentation on /docs.
// The layers it runs on are built in src/Layers.ts, next to the CLI's; this
// file only launches them.
//
//   pnpm checkpoint 23 server
import { NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import * as Layers from "../Layers.ts"

Layer.launch(Layers.server).pipe(NodeRuntime.runMain)
