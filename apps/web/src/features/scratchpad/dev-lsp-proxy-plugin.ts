import * as net from "node:net"
import type { Plugin } from "vite"

export const devLspProxyPlugin = (
  target = process.env.LSP_BRIDGE_URL ?? "http://127.0.0.1:8787",
): Plugin => {
  const parsed = new URL(target)
  const targetHost = parsed.hostname
  const targetPort =
    Number(parsed.port) ||
    (parsed.protocol === "https:" || parsed.protocol === "wss:" ? 443 : 80)

  return {
    name: "scratchpad-dev-lsp-proxy",
    apply: "serve",
    configureServer(server) {
      server.httpServer?.on("upgrade", (req, clientSocket, head) => {
        if (!req.url || !req.url.startsWith("/api/lsp")) {
          return
        }

        const upstream = net.connect(targetPort, targetHost, () => {
          const lines = [
            `${req.method ?? "GET"} ${req.url} HTTP/${req.httpVersion}`,
          ]
          for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const name = req.rawHeaders[i]
            const value = req.rawHeaders[i + 1]
            if (name === undefined || value === undefined) continue
            if (name.toLowerCase() === "host") {
              lines.push(`Host: ${targetHost}:${targetPort}`)
            } else {
              lines.push(`${name}: ${value}`)
            }
          }
          lines.push("", "")
          upstream.write(lines.join("\r\n"))
          if (head.length > 0) {
            upstream.write(head)
          }
          clientSocket.pipe(upstream)
          upstream.pipe(clientSocket)
        })

        const teardown = () => {
          clientSocket.destroy()
          upstream.destroy()
        }
        upstream.on("error", teardown)
        clientSocket.on("error", teardown)
      })
    },
  }
}
