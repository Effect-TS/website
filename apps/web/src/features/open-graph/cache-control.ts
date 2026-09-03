export const cacheControl = (url: URL): string =>
  url.searchParams.has("v")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=0, must-revalidate"
