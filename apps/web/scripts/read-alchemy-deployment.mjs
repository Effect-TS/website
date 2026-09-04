import { readFile } from "node:fs/promises"

const [logPath] = process.argv.slice(2)
if (logPath === undefined) {
  console.error("Usage: read-alchemy-deployment.mjs <alchemy-log>")
  process.exit(1)
}

const log =
  logPath === "-"
    ? await (async () => {
        process.stdin.setEncoding("utf8")
        let input = ""
        for await (const chunk of process.stdin) input += chunk
        return input
      })()
    : await readFile(logPath, "utf8")
const readLast = (name) => {
  const expression = new RegExp(`${name}:\\s*["']([^"']+)["']`, "g")
  return [...log.matchAll(expression)].at(-1)?.[1]
}
const websiteUrl = readLast("websiteUrl")
const workerName = readLast("workerName")

if (websiteUrl === undefined || workerName === undefined) {
  console.error("Alchemy output did not contain websiteUrl and workerName")
  process.exit(1)
}

console.log(websiteUrl)
console.log(workerName)
