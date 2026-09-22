import type { ComponentProps } from "react"
import "./AnimationFrame.css"

export function AnimationFrame({
  className = "",
  ...props
}: ComponentProps<"figure">) {
  return <figure {...props} className={`animation-demo ${className}`} />
}
