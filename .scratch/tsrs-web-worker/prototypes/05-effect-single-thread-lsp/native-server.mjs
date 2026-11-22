// The native reference behind the same pump interface as lsp-host.js: spawns `tsrs --lsp --stdio` (the
// Effect-patched build, target/debug/tsrs of the effect-tsgo tree) in a temp dir holding exactly the in-memory
// workspace's files (effect's .d.ts and package.json files only, so both sides resolve the same declarations), and
// rewrites /workspace paths both ways.
//
// A request's send() resolves with everything the server wrote up to and including its response. A notification
// has no reply, so its send() waits until the server has been quiet for `quietMs` (default 30). Timings of
// notifications are therefore not comparable with wasm; request timings are request -> response.
import { spawn } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { ROOT } from "./workspace.js"

export function startNativeServer(
  bin,
  files,
  { quietMs = 30, stderr = () => {} } = {},
) {
  const dir = mkdtempSync(
    join(process.env.TMPDIR ?? tmpdir(), "tsrs-effect-native-"),
  )
  for (const [p, data] of Object.entries(files)) {
    const real = join(dir, p.slice(ROOT.length))
    mkdirSync(dirname(real), { recursive: true })
    writeFileSync(real, data)
  }
  const child = spawn(bin, ["--lsp", "--stdio"], {
    cwd: dir,
    stdio: ["pipe", "pipe", "pipe"],
  })
  child.stderr.on("data", (d) => stderr(String(d)))
  let buf = Buffer.alloc(0)
  let inbox = []
  let waiters = []
  child.stdout.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk])
    for (;;) {
      const h = buf.indexOf("\r\n\r\n")
      if (h < 0) break
      const len = +/Content-Length: (\d+)/i.exec(
        buf.subarray(0, h).toString(),
      )[1]
      if (buf.length < h + 4 + len) break
      inbox.push(buf.subarray(h + 4, h + 4 + len).toString())
      buf = buf.subarray(h + 4 + len)
      for (const w of [...waiters]) w()
    }
  })
  const exited = new Promise((r) => child.on("exit", r))
  const write = (json) =>
    child.stdin.write(
      `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`,
    )
  const wait = (pred, quiet) =>
    new Promise((resolve) => {
      let timer
      const done = () => {
        waiters = waiters.filter((w) => w !== check)
        clearTimeout(timer)
        resolve()
      }
      const check = () => {
        if (pred()) done()
        else if (quiet) {
          clearTimeout(timer)
          timer = setTimeout(done, quiet)
        }
      }
      waiters.push(check)
      check()
    })
  const toNative = (s) =>
    s
      .replaceAll(`file://${ROOT}`, `file://${dir}`)
      .replaceAll(`"${ROOT}/`, `"${dir}/`)
  const fromNative = (s) =>
    s.replaceAll(`file://${dir}`, `file://${ROOT}`).replaceAll(dir, ROOT)
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
  return {
    dir,
    status: 0,
    dead: null,
    recoveries: [], // never recovers; deep.js reads this
    async send(json) {
      const m = JSON.parse(json)
      // Messages that arrived since the last send (late pushes, logs) are returned with this one's.
      write(toNative(json))
      if (m.method === "exit") {
        await exited
        return []
      }
      if (m.id !== undefined && m.method) {
        await wait(() =>
          inbox.some((t) => {
            const r = JSON.parse(t)
            return r.id === m.id && !r.method
          }),
        )
      } else if (m.id !== undefined) {
        // a response to a server request: no reply
        await wait(() => false, quietMs)
      } else {
        await wait(() => false, quietMs)
      }
      const out = inbox
      inbox = []
      return out.map(fromNative)
    },
    async tick() {
      return []
    },
    nextTimerMs: () => -1,
    memoryBytes: rss,
    close() {
      child.kill()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
