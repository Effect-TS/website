import type { DocumentGen } from "contentlayer/core"
import fs from "fs"
import srtParser2 from "srt-parser-2"

export const transcriptFromSrt = (episode: DocumentGen) => {
  const parser = new srtParser2()
  const srtFilePath = `./content/${episode._raw.flattenedPath.replace("notes", "srt")}.srt`
  const srtObject = parser.fromSrt(fs.readFileSync(srtFilePath).toString())
  return srtObject.map(({ startTime, text }) => [
    startTime.split(",")[0],
    text
  ])
}
