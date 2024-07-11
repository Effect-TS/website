import type {DocumentGen} from 'contentlayer2/core'
import * as fs from 'node:fs/promises'
import path from 'node:path'

export const getLastEditedDate = async (page: DocumentGen): Promise<Date> => {
  const stats = await fs.stat(path.join('content', page._raw.sourceFilePath))
  return stats.mtime
}
