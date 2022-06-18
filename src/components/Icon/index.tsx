import { FC } from 'react'

import { CodeIcon } from './Code'
import { DiscordIcon } from './Discord'
import { ExternalLinkIcon } from './ExternalLink'
import { GitHubIcon } from './GitHub'

export type IconName = 'code' | 'discord' | 'external-link' | 'github'

const iconMap = {
  code: CodeIcon,
  discord: DiscordIcon,
  'external-link': ExternalLinkIcon,
  github: GitHubIcon,
}

export const Icon: FC<{ name: IconName }> = ({ name }) => {
  const IconComponent = iconMap[name]
  return <IconComponent />
}
