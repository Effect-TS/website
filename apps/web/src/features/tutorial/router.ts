const PREFIX = "/tutorial/"

export const lessonHref = (slug: string): string => `${PREFIX}${slug}`

export const slugOf = (pathname: string): string =>
  pathname.startsWith(PREFIX)
    ? pathname.slice(PREFIX.length).replace(/\/$/, "")
    : ""
