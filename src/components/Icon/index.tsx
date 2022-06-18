import { FC } from 'react'

import { CodeIcon } from './Code'
import { ColorMode } from './ColorMode'
import { DiscordIcon } from './Discord'
import { EffectFull } from './EffectFull'
import { ExternalLinkIcon } from './ExternalLink'
import { GitHubIcon } from './GitHub'

const iconMap = {
  code: CodeIcon,
  discord: DiscordIcon,
  'external-link': ExternalLinkIcon,
  github: GitHubIcon,
  'color-mode': ColorMode,
  'effect-full': EffectFull,
}

export type IconName = keyof typeof iconMap

export const Icon: FC<{ name: IconName }> = ({ name }) => {
  const IconComponent = iconMap[name]
  return <IconComponent />
}
