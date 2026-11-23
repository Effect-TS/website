// Serves page/ with COOP/COEP on 5181 using apps/web's Vite and @webcontainer/api.
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import Path from "node:path"
import Fs from "node:fs"

const here = Path.dirname(fileURLToPath(import.meta.url))
const appsWeb = Path.resolve(here, "../../../../apps/web")
const require = createRequire(Path.join(appsWeb, "package.json"))
const { createServer } = await import(require.resolve("vite"))
const wcApi = Fs.realpathSync(
  Path.join(appsWeb, "node_modules/@webcontainer/api"),
)

const server = await createServer({
  configFile: false,
  root: Path.join(here, "page"),
  logLevel: "warn",
  resolve: {
    alias: { "@webcontainer/api": Path.join(wcApi, "dist/index.js") },
  },
  server: {
    port: 5181,
    strictPort: true,
    fs: { allow: [here, wcApi] },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: { noDiscovery: true, include: [] },
})
await server.listen()
console.log("listening http://localhost:5181")
