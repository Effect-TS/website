import {FC} from 'react'

export const Glow: FC<{direction: 'down' | 'up'}> = ({direction}) => {
  return (
    <div className={`absolute inset-x-0 ${direction === 'up' ? 'bottom-0' : 'top-0'} h-96 overflow-hidden`}>
      <div
        className={`absolute left-1/2 -translate-x-1/2 ${
          direction === 'up' ? 'bottom-0 translate-y-1/2' : 'top-0 -translate-y-1/2'
        } h-1/2 w-1/2 bg-white/5 blur-3xl`}
        style={{borderRadius: '50% 50%'}}
      />
    </div>
  )
}
