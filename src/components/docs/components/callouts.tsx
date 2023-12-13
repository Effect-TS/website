import React from "react"
import type { ReactElement, ReactNode } from "react"
import cn from "clsx"
import { Icon } from "@/components/icons"

export const Error = ({ children }: { children: ReactNode }) => {
  return <Callout type="error">{children}</Callout>
}

export const Info = ({ children }: { children: ReactNode }) => {
  return <Callout type="info">{children}</Callout>
}

export const Warning = ({ children }: { children: ReactNode }) => {
  return <Callout type="warning">{children}</Callout>
}

export const Design = ({ children }: { children: ReactNode }) => {
  return <Callout emoji="🎨">{children}</Callout>
}

export const Idea = ({ children }: { children: ReactNode }) => {
  return <Callout>{children}</Callout>
}

export const Stub: React.FC = () => (
  <>
    <Callout emoji="🚨">This page is a stub. Help us expand it by contributing!</Callout>
    <p className="mt-6 leading-7 first:mt-0">
      To contribute to the documentation, please join our Discord community at&nbsp;
      <a
        href="https://discord.com/channels/795981131316985866/848185224356691978"
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline decoration-from-font [text-underline-position:from-font]"
      >
        the Docs channel
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      &nbsp;and let us know which part of the documentation you would like to contribute to. We appreciate your help in improving our library&apos;s
      documentation. Thank you!
    </p>
  </>
)

const classes: Record<CalloutType, string> = {
  default: cn("bg-white/10 border-white/20"),
  error: cn("bg-red-500/10 border-red-500/20"),
  info: cn("bg-blue-500/10 border-blue-500/20"),
  warning: cn("bg-amber-500/10 border-amber-500/20")
}

type CalloutProps = {
  type?: CalloutType
  emoji?: string | ReactNode
  children: ReactNode
}

export const Callout = ({ children, type = "default", emoji = TypeToEmoji[type] }: CalloutProps): ReactElement => {
  return (
    <div className={cn("mt-6 flex rounded-xl border pl-5 pr-6 gap-x-4", classes[type])}>
      <div
        className="shrink-0 select-none text-xl pt-6"
        style={{
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
        }}
      >
        {emoji}
      </div>
      <div className="w-full min-w-0 leading-7 text-white/70">
        <div className="mb-5" />
        {children}
        <div className="mt-5" />
      </div>
    </div>
  )
}

const TypeToEmoji = {
  default: <Icon name="lightbulb-solid" className="h-5 text-yellow-100" />,
  error: <Icon name="error" className="h-5 text-red-500" />,
  info: <Icon name="info" className="h-5 text-blue-500" />,
  warning: <Icon name="alert" className="h-5 text-amber-500" />
}

type CalloutType = keyof typeof TypeToEmoji
