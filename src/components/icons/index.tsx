import { FC } from "react"
import { DiscordIcon } from "./discord"
import { GithubIcon } from "./github"
import { ArrowUpRightLightIcon } from "./arrow-up-right-light"
import { SearchIcon } from "./search"
import { TwitterIcon } from "./twitter"
import { ArrowRightIcon } from "./arrow-right"
import { CheckCircleIcon } from "./check-circle"
import { ArrowUpRightIcon } from "./arrow-up-right"
import { PlayIcon } from "./play"
import { BlocksIcon } from "./blocks"
import { PlugsIcon } from "./plugs"
import { ShieldIcon } from "./shield"
import { NodeIcon } from "./node"
import { BunIcon } from "./bun"
import { DenoIcon } from "./deno"
import { CloudflareIcon } from "./cloudflare"
import { GraphQLIcon } from "./graphql"
import { OpenAPIIcon } from "./open-api"
import { ReactIcon } from "./react"
import { NextIcon } from "./next"
import { AmazonIcon } from "./amazon"
import { ChevronRightIcon } from "./chevron-right"
import { TrendUpIcon } from "./trend-up"
import { LightBulbIcon } from "./lightbulb"
import { CheckIcon } from "./check"
import { BarsIcon } from "./bars"
import { AlertIcon } from "./alert"
import { LightbulbSolidIcon } from "./lightbulb-solid"
import { InfoIcon } from "./info"
import { ErrorIcon } from "./error"
import { SunIcon } from "./sun"
import { MoonIcon } from "./moon"
import { DisplayIcon } from "./display"
import { GearIcon } from "./gear"

const icons = {
  alert: AlertIcon,
  amazon: AmazonIcon,
  "arrow-right": ArrowRightIcon,
  "arrow-up-right": ArrowUpRightIcon,
  "arrow-up-right-light": ArrowUpRightLightIcon,
  bars: BarsIcon,
  blocks: BlocksIcon,
  bun: BunIcon,
  check: CheckIcon,
  "check-circle": CheckCircleIcon,
  "chevron-right": ChevronRightIcon,
  cloudflare: CloudflareIcon,
  deno: DenoIcon,
  discord: DiscordIcon,
  display: DisplayIcon,
  error: ErrorIcon,
  gear: GearIcon,
  github: GithubIcon,
  graphql: GraphQLIcon,
  info: InfoIcon,
  lightbulb: LightBulbIcon,
  "lightbulb-solid": LightbulbSolidIcon,
  moon: MoonIcon,
  next: NextIcon,
  node: NodeIcon,
  "open-api": OpenAPIIcon,
  play: PlayIcon,
  plugs: PlugsIcon,
  react: ReactIcon,
  search: SearchIcon,
  shield: ShieldIcon,
  sun: SunIcon,
  "trend-up": TrendUpIcon,
  twitter: TwitterIcon
}

export type IconName = keyof typeof icons

export const Icon: FC<{ name: IconName; className: string }> = ({ name, className }) => {
  const IconComponent = icons[name]
  return <IconComponent className={className} />
}
