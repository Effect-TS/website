import { Logger } from "effect"

const ANSI = {
  Reset: "\x1b[0m",
  Bold: "\x1b[1m"
}

export const logger = Logger.make(({ logLevel, message }) => {
  if (logLevel._tag === "Debug") {
    globalThis.console.log(`[${logLevel.label}] ${message}`)
  } else {
    globalThis.console.log(
      `${ANSI.Bold}[${logLevel.label}] ${message}${ANSI.Reset}`
    )
  }
})
