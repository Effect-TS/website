// Same as the Playground's dev-tools-proxy: TCP sink on 34437 piping to stdout.
const Net = require("node:net")
const server = Net.createServer((socket) => {
  socket.on("error", () => {})
  socket.on("data", (d) => process.stdout.write(`[devtools ${d.length}b]\n`))
})
server.on("error", (e) => console.error("proxy error", e.message))
server.listen(34437, () => console.log("proxy listening"))
