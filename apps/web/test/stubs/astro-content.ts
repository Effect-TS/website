export const getCollection = (): Promise<never> =>
  Promise.reject(new Error("astro:content is unavailable in unit tests"))
