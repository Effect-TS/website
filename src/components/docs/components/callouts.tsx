import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import cn from 'clsx'

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
    <Callout emoji="🚨">
      This page is a stub. Help us expand it by contributing!
    </Callout>
    <p className="mt-6 leading-7 first:mt-0">
      To contribute to the documentation, please join our Discord community
      at&nbsp;
      <a
        href="https://discord.com/channels/795981131316985866/848185224356691978"
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline decoration-from-font [text-underline-position:from-font]"
      >
        the Docs channel
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      &nbsp;and let us know which part of the documentation you would like to
      contribute to. We appreciate your help in improving our library&apos;s
      documentation. Thank you!
    </p>
  </>
)


const classes: Record<CalloutType, string> = {
  default: cn(
    'border-orange-100 bg-orange-50 text-orange-800 dark:border-orange-400/30 dark:bg-orange-400/20 dark:text-orange-300'
  ),
  error: cn(
    'border-red-200 bg-red-100 text-red-900 dark:border-red-200/30 dark:bg-red-900/30 dark:text-red-200'
  ),
  info: cn(
    'border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-200/30 dark:bg-blue-900/30 dark:text-blue-200'
  ),
  warning: cn(
    'border-yellow-100 bg-yellow-50 text-yellow-900 dark:border-yellow-200/30 dark:bg-yellow-700/30 dark:text-yellow-200'
  )
}

type CalloutProps = {
  type?: CalloutType
  emoji?: string | ReactNode
  children: ReactNode
}

export const Callout = (
  {
    children,
    type = 'default',
    emoji = TypeToEmoji[type]
  }: CalloutProps
): ReactElement => {
  return (
    <div
      className={cn(
        'overflow-x-auto mt-6 flex rounded-lg border py-2 ltr:pr-4 rtl:pl-4',
        'contrast-more:border-current contrast-more:dark:border-current',
        classes[type]
      )}
    >
      <div
        className="select-none text-xl ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2"
        style={{
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
        }}
      >
        {emoji}
      </div>
      <div className="w-full min-w-0 leading-7">{children}</div>
    </div>
  )
};

export const InformationCircleIcon = (props: React.ComponentProps<'svg'>): ReactElement => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      width="20"
      height="20"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
      />
    </svg>
  )
};

const TypeToEmoji = {
  default: '💡',
  error: '🚫',
  info: <InformationCircleIcon className="mt-1" />,
  warning: '⚠️'
}

type CalloutType = keyof typeof TypeToEmoji