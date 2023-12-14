import Image from "next/image"
import Link from "next/link"
import { FC } from "react"
import { Icon } from "../icons"

export const Author: FC<{ name: string; description: string; avatar: string; twitter?: string }> = ({ name, description, avatar, twitter }) => {
  return (
    <div className="flex gap-2 items-center mt-3">
      <div className="relative w-14 h-14 rounded-full overflow-hidden border border-black dark:border-white shadow-lg">
        <Image src={avatar} alt={name} fill />
      </div>
      <div className="leading-snug text-sm">
        <div className="text-black font-normal dark:font-light dark:text-white">{name}</div>
        <div>{description}</div>
        {twitter && (
          <Link href={twitter} target="_blank">
            <Icon name="twitter" className="mt-0.5 h-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
