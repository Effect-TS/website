export function isBlogRoot(slug: string) {
  return slug === "blog"
}

export function isAnyBlogPage(slug: string) {
  return new RegExp(`^blog(/?$|/.+/?$)`).exec(slug) !== null
}
