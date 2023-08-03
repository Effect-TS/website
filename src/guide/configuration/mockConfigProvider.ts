import { Effect, ConfigProvider } from "effect"
import * as App from "./App"

// Create a mock config provider using ConfigProvider.fromMap
const mockConfigProvider = ConfigProvider.fromMap(
  new Map([
    ["HOST", "localhost"],
    ["PORT", "8080"]
  ])
)

// Create a layer using Effect.setConfigProvider to override the default config provider
const layer = Effect.setConfigProvider(mockConfigProvider)

// Run the program using the provided layer
Effect.runSync(Effect.provideLayer(App.program, layer))
// Output: Application started: localhost:8080
