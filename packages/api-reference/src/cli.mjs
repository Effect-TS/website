#!/usr/bin/env node

const [command, ...arguments_] = process.argv.slice(2)

if (command === "--help" || command === "-h" || command === undefined) {
  console.log(`Usage: api-reference <command> [options]

Commands:
  generate              Generate an API reference dataset
  snapshot id           Compute a deterministic snapshot ID
  snapshot create       Create a snapshot manifest
  snapshot validate     Validate a snapshot manifest and datasets

Run api-reference generate --help for generator options.`)
  process.exit(0)
}

switch (command) {
  case "generate":
    process.argv = [process.argv[0], process.argv[1], ...arguments_]
    await import("./generate.mjs")
    break
  case "snapshot":
    process.argv = [process.argv[0], process.argv[1], ...arguments_]
    await import("./snapshot.mjs")
    break
  default:
    throw new Error(`Unknown API reference command: ${command}`)
}
