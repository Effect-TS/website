import {FC} from 'react'

export const Divider: FC<{className?: string}> = ({className = ''}) => {
  return <hr className={`w-full border-none h-px bg-gradient-to-r from-white/0 via-white/25 to-white/0 ${className}`} />
}
