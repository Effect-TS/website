import * as React from "react"

/**
 * The time (in nanoseconds) of the event hovered in the span details, if any.
 * The waterfall draws a guide line down every row at that moment.
 */
export const HoveredEventContext = React.createContext<bigint | undefined>(
  undefined,
)
