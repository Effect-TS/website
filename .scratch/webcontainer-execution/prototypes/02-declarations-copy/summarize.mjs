// node summarize.mjs -> one row per results/*.json
import * as fs from "node:fs"
const dir = new URL("./results/", import.meta.url)
const mb = (n) => (n / 1e6).toFixed(1)
for (const f of fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort()) {
  const r = JSON.parse(fs.readFileSync(new URL(f, dir)))
  if (r.error) {
    console.log(f, "ERROR", r.error.slice(0, 200))
    continue
  }
  const m = r.methods
  const c = m.C1fresh
  const errs = (d) =>
    Object.values(d)
      .flat()
      .filter((x) => x.startsWith("sev1")).length
  console.log(
    JSON.stringify({
      run: f.replace(".json", ""),
      install: r.install.ms,
      A: `${m.A.ms} ms ${m.A.files} f ${mb(m.A.bytes)} MB (${m.A.readdirs} readdir + ${m.A.reads} readFile)`,
      Bfull: `${m.Bfull.totalMs} ms (spawn+script ${m.Bfull.scriptMs}, in-script ${m.Bfull.stats.ms}, readFile ${m.Bfull.readMs}) ${m.Bfull.stats.files} f ${mb(m.Bfull.stats.bytes)} MB`,
      Bskip: `${m.BskipTsLibs.totalMs} ms ${m.BskipTsLibs.stats.files} f ${mb(m.BskipTsLibs.stats.bytes)} MB`,
      C1: `${c.exportMs} ms + flatten ${c.flattenMs} ms, raw ${c.rawFiles} f, symlinks ${c.symlinks}, vsB missing ${c.vsB.missing} ${JSON.stringify(c.vsB.missingSample)}`,
      C1after: `${m.C1after.exportMs} ms raw ${m.C1after.rawFiles}`,
      C2: `${m.C2fresh.exportMs} ms raw ${m.C2fresh.rawFiles}`,
      tsrsB: `post+mount+pull ${r.tsrsB.roundTripMs} ms (mount ${Math.round(r.tsrsB.mountMs)}, pull ${Math.round(r.tsrsB.pullMs)}) errors ${errs(r.tsrsB.diagnostics)}, remount ${r.tsrsBRemount.roundTripMs} ms, probe errors ${r.probeB.diagnostics.filter((x) => x.startsWith("sev1")).length}`,
      tsrsA: `errors ${errs(r.tsrsA.diagnostics)}`,
      tsrsC: `errors ${errs(r.tsrsC.diagnostics)}`,
      workerStart: Math.round(r.workerStart.startMs),
      pkgs: Object.keys(m.Bfull.stats.perPackage).length,
      dropped: m.Bfull.stats.dropped.length,
      multiVersion: c.multiVersion,
    }),
  )
}
