import { snapshot } from "@webcontainer/snapshot"
import { execSync } from "node:child_process"
import * as FS from "node:fs/promises"
import * as Path from "node:path"
import { fileURLToPath } from "node:url"

const dirname = Path.dirname(fileURLToPath(import.meta.url))

async function processDir(name) {
  const directory = Path.join(dirname, name)
  await FS.rm(`${directory}/.npm-cache`, { recursive: true, force: true })
  await FS.rm(`${directory}/package-lock.json`, { force: true })

  execSync("corepack npm install", { cwd: directory })

  await FS.rm(`${directory}/node_modules`, { recursive: true, force: true })
  const buf = await snapshot(directory)
  await FS.writeFile(Path.join(dirname, "..", "public/snapshots", name), buf)
}

async function main() {
  for (const dir of await FS.readdir(dirname, {
    withFileTypes: true
  })) {
    if (dir.isDirectory()) {
      await processDir(dir.name)
    }
  }
}

main().catch(console.error)
