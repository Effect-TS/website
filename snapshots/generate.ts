import { snapshot } from "@webcontainer/snapshot"
import { execSync } from "node:child_process"
import * as FS from "node:fs/promises"
import * as Path from "node:path"

async function process(name: string) {
  const directory = Path.join(__dirname, name)
  await FS.rm(`${directory}/.pnpm-store`, { recursive: true, force: true })
  await FS.rm(`${directory}/pnpm-lock.yaml`, { force: true })

  execSync("corepack pnpm install", { cwd: directory })

  await FS.rm(`${directory}/node_modules`, { recursive: true, force: true })
  const buf = await snapshot(directory)
  await FS.writeFile(
    Path.join(__dirname, "..", "public/snapshots", name),
    buf
  )
}

async function main() {
  for (const dir of await FS.readdir(__dirname, { withFileTypes: true })) {
    if (dir.isDirectory()) {
      await process(dir.name)
    }
  }
}

main().catch(console.error)
