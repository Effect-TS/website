// Baseline: the same session against native `tsrs --lsp --stdio` (threads, real file system in a temp dir).
// node run-native.mjs <tsrs binary> <dir containing node_modules/effect> [--edits N] [--out file.json]
// Notifications have no reply, so send() of a notification waits until the server has been quiet for 30 ms; request
// timings are request -> response. Server->client requests are answered by session.js.
import { spawn } from "node:child_process"
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { MAIN, TSCONFIG, runSession, summarize } from "./session.js"

const [bin, expDir, ...rest] = process.argv.slice(2)
const opt = (name, d) =>
  rest.includes(name) ? rest[rest.indexOf(name) + 1] : d
const dir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), "tsrs-native-"))
cpSync(join(expDir, "node_modules/effect"), join(dir, "node_modules/effect"), {
  recursive: true,
})
writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(TSCONFIG))
writeFileSync(join(dir, "main.ts"), MAIN)

const child = spawn(bin, ["--lsp", "--stdio"], {
  cwd: dir,
  stdio: ["pipe", "pipe", "pipe"],
})
child.stderr.on("data", () => {})
let buf = Buffer.alloc(0)
let inbox = []
let waiters = []
child.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk])
  for (;;) {
    const h = buf.indexOf("\r\n\r\n")
    if (h < 0) break
    const len = +/Content-Length: (\d+)/i.exec(buf.subarray(0, h).toString())[1]
    if (buf.length < h + 4 + len) break
    const text = buf.subarray(h + 4, h + 4 + len).toString()
    buf = buf.subarray(h + 4 + len)
    const m = JSON.parse(text)
    inbox.push(text)
    for (const w of waiters) w()
  }
})
const write = (json) =>
  child.stdin.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`)
const wait = (pred, quietMs) =>
  new Promise((resolve) => {
    let timer
    const check = () => {
      if (pred()) {
        waiters = waiters.filter((w) => w !== check)
        clearTimeout(timer)
        resolve()
      } else if (quietMs) {
        clearTimeout(timer)
        timer = setTimeout(() => {
          waiters = waiters.filter((w) => w !== check)
          resolve()
        }, quietMs)
      }
    }
    waiters.push(check)
    check()
  })
let lastRss = 0
const rss = () => {
  try {
    lastRss =
      +/VmRSS:\s+(\d+)/.exec(
        readFileSync(`/proc/${child.pid}/status`, "utf8"),
      )[1] * 1024
  } catch {}
  return lastRss
}
let status = 0
const server = {
  get status() {
    return status
  },
  dead: null,
  async send(json) {
    const m = JSON.parse(json)
    // Rewrite the session's /p paths into the temp dir.
    const rewritten = JSON.stringify(m)
      .replaceAll("file:///p", `file://${dir}`)
      .replaceAll('"/p/', `"${dir}/`)
    inbox = []
    write(rewritten)
    if (m.id !== undefined && m.method) {
      if (m.method === "exit") return []
      await wait(() =>
        inbox.some((t) => {
          const r = JSON.parse(t)
          return r.id === m.id && !r.method
        }),
      )
    } else {
      await wait(() => false, 30)
    }
    return inbox.map((t) =>
      t.replaceAll(`file://${dir}`, "file:///p").replaceAll(dir, "/p"),
    )
  },
  async tick() {
    return []
  },
  memoryBytes: rss,
}
const results = await runSession(server, {
  log: (s) => console.error(s),
  edits: +opt("--edits", 50),
  deep: [500, 1000, 1500, 2000, 2500, 3000, 5000],
})
child.kill()
rmSync(dir, { recursive: true, force: true })
const out = {
  runtime: "native tsrs --lsp --stdio",
  summary: summarize(results),
  results,
}
console.log(JSON.stringify(out.summary, null, 1))
if (opt("--out")) writeFileSync(opt("--out"), JSON.stringify(out, null, 1))
