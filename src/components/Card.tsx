import * as React from 'react'
import Markdown from 'markdown-to-jsx'
import Link from 'next/link'

import { Icon, IconName } from './Icon'
import { Label } from './Label'

export const Card: React.FC<
  React.PropsWithChildren<{
    title: string
    icon?: IconName | null
    label?: string | null
    subtitle?: string | null
    link?: { label: string; url: string }
  }>
> = ({ title, icon, label, subtitle, children, link }) => {
  return (
    <div className="border p-4 rounded-md border-gray-500">
      <h2 className="m-0 mb-2 text-xl flex items-center">
        {icon && (
          <span className="w-6 inline-block mr-2">
            <Icon name={icon} />
          </span>
        )}
        {title}{' '}
        {label && (
          <span className="inline-block ml-2">
            <Label text={label} />
          </span>
        )}
      </h2>
      {subtitle && (
        <div className="text-sm">
          <Markdown>{subtitle}</Markdown>
        </div>
      )}
      {children && <div className="text-sm">{children}</div>}
      {link?.label && link?.url && (
        <Link href={link.url} className="inline-block mt-4">
          {link.label}
        </Link>
      )}
    </div>
  )
}
