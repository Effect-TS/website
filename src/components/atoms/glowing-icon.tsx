import {FC} from 'react'
import {Icon, IconName} from '../icons'

export const GlowingIcon: FC<{name: IconName}> = ({name}) => {
  return (
    <div className="relative">
      <div className="absolute inset-1 bg-white/50 blur-md" style={{borderRadius: '50% 50%'}} />
      <Icon name={name} className="relative h-8 text-zinc-200" />
    </div>
  )
}
