import { ConfigProvider, Layer, Effect } from "effect"
import * as App from "./App"

// Create a mock config provider using ConfigProvider.fromMap
const mockConfigProvider = ConfigProvider.fromMap(
  new Map([
    ["HOST", "localhost"],
    ["PORT", "8080"]
  ])
)

// Create a layer using Layer.setConfigProvider to override the default config provider
const layer = Layer.setConfigProvider(mockConfigProvider)

// Run the program using the provided layer
Effect.runSync(Effect.provide(App.program, layer))
// Output: Application started: localhost:8080
