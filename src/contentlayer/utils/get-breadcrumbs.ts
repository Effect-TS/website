import {allDocsPages} from 'contentlayer/generated'

export const getBreadcrumbs = (pathSegments: PathSegment[]) => {
  const segments = [...pathSegments.slice(0, pathSegments.length - 1)]
  let path = '/docs'
  let breadcrumbs: Breadcrumbs = []
  for (const {pathName} of segments) {
    path += `/${pathName}`
    const page = allDocsPages.find((page) => page.urlPath === path)
    if (page) breadcrumbs.push({name: page.title, href: page.urlPath})
  }
  return breadcrumbs
}
