export const fontData = {}

export const getImage = (): Promise<never> =>
  Promise.reject(new Error("getImage is unavailable in unit tests"))

export const experimental_getFontFileURL = (url: string): string => url
