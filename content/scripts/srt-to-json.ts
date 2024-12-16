import Fs from "node:fs/promises"
import SrtParser2 from "srt-parser-2"

async function main() {
  const inputPath = process.argv[2]
  const outputPath = process.argv[3]
  if (!inputPath) {
    throw new Error("Please specify a path to the `.srt` file to parse")
  }
  if (!outputPath) {
    throw new Error("Please specify a path to write the JSON-encoded `.srt` file")
  }
  const srt = await Fs.readFile(inputPath, "utf8")
  const parser = new SrtParser2()
  const json = parser.fromSrt(srt)
  await Fs.writeFile(outputPath, JSON.stringify(json, undefined, 2), "utf8")
}

main()

