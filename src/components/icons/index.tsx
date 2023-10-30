import {FC} from 'react'
import {DiscordIcon} from './discord'
import {GithubIcon} from './github'
import {ArrowUpRightIcon} from './arrow-up-right'
import {SearchIcon} from './search'
import {TwitterIcon} from './twitter'

const icons = {
  'arrow-up-right': ArrowUpRightIcon,
  discord: DiscordIcon,
  github: GithubIcon,
  search: SearchIcon,
  twitter: TwitterIcon
}

export type IconName = keyof typeof icons

export const Icon: FC<{name: IconName; className: string}> = ({name, className}) => {
  const IconComponent = icons[name]
  return <IconComponent className={className} />
}
