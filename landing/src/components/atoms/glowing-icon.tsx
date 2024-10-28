import { FC } from "react"
import { Icon } from "../icons"

export const GlowingIcon: FC<{ name: Icon.Name }> = ({ name }) => {
  return (
    <div className="relative">
      <div
        className="absolute inset-1 bg-white/50 blur-md"
        style={{ borderRadius: "50% 50%" }}
      />
      <Icon name={name} className="relative h-8 text-zinc-200" />
    </div>
  )
}
