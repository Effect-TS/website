// Module Web Worker: runs the stock @tsrs/wasm browser host (browser.js) against the module at ./tsrs.wasm.
import { tsc, loadModule } from "./host/browser.js"
self.onmessage = async (e) => {
  const { files, runs } = e.data
  try {
    const t0 = performance.now()
    const module = await loadModule(new URL("./tsrs.wasm", import.meta.url))
    const loadMs = performance.now() - t0
    const results = []
    for (let i = 0; i < runs; i++) {
      const f = {
        ...files,
        "/p/main.ts":
          files["/p/main.ts"] + (i ? `\nexport const v${i} = ${i}\n` : ""),
      }
      const t = performance.now()
      const r = await tsc(["-p", "/p/tsconfig.json"], {
        cwd: "/p",
        files: f,
        diagnostics: "json",
        module,
      })
      results.push({
        ms: performance.now() - t,
        exitCode: r.exitCode,
        memoryBytes: r.memoryBytes,
        stderr: r.stderr,
        diagnostics: i === 0 ? r.diagnostics : r.diagnostics.length,
      })
    }
    self.postMessage({ loadMs, results })
  } catch (err) {
    self.postMessage({ error: String((err && err.stack) || err) })
  }
}
