import Link from 'next/link'
import {FC, ReactNode} from 'react'
import {Icon} from '../icons'

export const Button: FC<{secondary?: boolean | false; href: string; children: ReactNode; className?: string}> = ({
  secondary,
  href,
  children,
  className = ''
}) => {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 rounded-xl p-px shadow-lg ${
        secondary ? 'bg-gradient-to-br from-zinc-300 to-zinc-500' : 'bg-gradient-to-b from-white to-zinc-300'
      } ${className}`}
    >
      <div
        className={`flex items-center gap-1 px-6 font-medium rounded-[11px] ${
          secondary ? 'bg-gradient-to-br from-zinc-700 to-zinc-900 text-white' : 'bg-white text-black'
        }`}
      >
        <span>{children}</span>
        <Icon name={href.startsWith('http') ? 'arrow-up-right' : 'arrow-right'} className={`h-3.5 ${href.startsWith('http') ? '-mt-1' : ''}`} />
      </div>
    </Link>
  )
}
