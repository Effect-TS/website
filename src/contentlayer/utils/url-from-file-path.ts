import type {DocumentGen} from 'contentlayer/core'

export const urlFromFilePath = (page: DocumentGen): string => {
  let urlPath = page._raw.flattenedPath.replace(/^pages\/?/, '/')
  if (!urlPath.startsWith('/')) urlPath = `/${urlPath}`

  urlPath = urlPath
    .split('/')
    .map((segment: string) => segment.replace(/^\d\d\d\-/, ''))
    .join('/')

  return urlPath
}
