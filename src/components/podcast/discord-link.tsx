import Link from "next/link"
import { DiscordIcon } from "@/components/icons/discord"

export const DiscordLink = () => {
  return (
    <Link
      href="https://discord.gg/effect-ts"
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose flex items-center gap-2 hover:underline my-12 text-black dark:text-white font-medium"
    >
      <DiscordIcon className="h-5" />
      <span>Discuss this episode on Discord</span>
    </Link>
  )
}
