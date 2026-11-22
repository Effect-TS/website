// node scripts/summarize-matrix.mjs <out dir>: medians over repeats of the main session numbers, one row per config.
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
const dir = process.argv[2]
const groups = {}
for (const f of readdirSync(dir).filter((f) =>
  /^session-.*-\d+\.json$/.test(f),
)) {
  const name = f.replace(/^session-/, "").replace(/-\d+\.json$/, "")
  ;(groups[name] ??= []).push(JSON.parse(readFileSync(join(dir, f), "utf8")))
}
const med = (xs) => {
  const s = xs
    .filter((x) => x != null && !Number.isNaN(x))
    .sort((a, b) => a - b)
  return s.length ? +s[Math.floor(s.length / 2)].toFixed(1) : null
}
const rows = []
for (const [name, runs] of Object.entries(groups).sort()) {
  const s = runs.map((r) => r.summary)
  const req = (k) => med(runs.map((r) => r.results.requests[k]?.ms))
  rows.push({
    name,
    n: runs.length,
    openMain: med(s.map((x) => x.openMs[0])),
    firstPullMain: med(runs.map((r) => r.results.firstPulls["src/main.ts"].ms)),
    firstDiag: med(s.map((x) => x.firstDiagnosticsMs)),
    firstPullsAll: med(
      runs.map((r) =>
        Object.values(r.results.firstPulls).reduce((a, b) => a + b.ms, 0),
      ),
    ),
    firstEdit: med(s.map((x) => x.firstEditCheckMs)),
    firstEditBg: med(s.map((x) => x.firstEditBackgroundMs)),
    editMedian: med(s.map((x) => x.editMedianMs)),
    editP90: med(s.map((x) => x.editP90Ms)),
    hoverAfterEdit: med(s.map((x) => x.hoverAfterEditMedianMs)),
    hoverProgram: req("hoverProgram"),
    completion: req("completionEffectDot"),
    codeAction: req("codeActionFloating"),
    memOpen: med(s.map((x) => x.memMiB.afterOpen)),
    memEnd: med(s.map((x) => x.memMiB.afterEdits)),
    codes:
      [...new Set(s.map((x) => JSON.stringify(x.codesByKind)))].length === 1
        ? "stable"
        : "VARIES",
    pullCodes: runs[0].summary.firstPulls["src/app.ts"],
  })
}
console.table(rows)
console.log(JSON.stringify(rows))
