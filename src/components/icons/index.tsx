import {FC} from 'react'
import {DiscordIcon} from './discord'
import {GithubIcon} from './github'
import {ArrowUpRightLightIcon} from './arrow-up-right-light'
import {SearchIcon} from './search'
import {TwitterIcon} from './twitter'
import {ArrowRightIcon} from './arrow-right'
import {CheckCircleIcon} from './check-circle'
import {ArrowUpRightIcon} from './arrow-up-right'
import {PlayIcon} from './play'
import {BlocksIcon} from './blocks'
import {PlugsIcon} from './plugs'
import {ShieldIcon} from './shield'
import {NodeIcon} from './node'
import {BunIcon} from './bun'
import {DenoIcon} from './deno'
import {CloudflareIcon} from './cloudflare'
import {GraphQLIcon} from './graphql'
import {OpenAPIIcon} from './open-api'
import {ReactIcon} from './react'
import {NextIcon} from './next'
import {AmazonIcon} from './amazon'
import {ChevronRightIcon} from './chevron-right'
import {TrendUpIcon} from './trend-up'
import {LightBulbIcon} from './lightbulb'

const icons = {
  amazon: AmazonIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-up-right': ArrowUpRightIcon,
  'arrow-up-right-light': ArrowUpRightLightIcon,
  blocks: BlocksIcon,
  bun: BunIcon,
  'check-circle': CheckCircleIcon,
  'chevron-right': ChevronRightIcon,
  cloudflare: CloudflareIcon,
  deno: DenoIcon,
  discord: DiscordIcon,
  github: GithubIcon,
  graphql: GraphQLIcon,
  lightbulb: LightBulbIcon,
  next: NextIcon,
  node: NodeIcon,
  'open-api': OpenAPIIcon,
  play: PlayIcon,
  plugs: PlugsIcon,
  react: ReactIcon,
  search: SearchIcon,
  shield: ShieldIcon,
  'trend-up': TrendUpIcon,
  twitter: TwitterIcon
}

export type IconName = keyof typeof icons

export const Icon: FC<{name: IconName; className: string}> = ({name, className}) => {
  const IconComponent = icons[name]
  return <IconComponent className={className} />
}
