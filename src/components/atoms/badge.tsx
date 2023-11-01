import {FC, ReactNode} from 'react'

export const Badge: FC<{children: ReactNode; className?: string}> = ({children, className = ''}) => {
  return (
    <div className={`${className}`}>
      <div className="relative">
        <svg viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 fill-current text-zinc-300">
          <path d="M29.6673 14.9286C29.6673 19.9555 27.2262 24.4022 23.4848 27.1074L25.6314 36.33C25.7473 36.8277 25.5783 37.3495 25.1944 37.6796C24.8105 38.0097 24.2769 38.092 23.8141 37.8926L15.0007 34.0944L6.18717 37.8926C5.7244 38.092 5.19077 38.0097 4.80688 37.6796C4.42299 37.3495 4.25405 36.8277 4.3699 36.33L6.5165 27.1074C2.77507 24.4022 0.333984 19.9555 0.333984 14.9286C0.333984 6.68375 6.90047 0 15.0007 0C23.1008 0 29.6673 6.68375 29.6673 14.9286Z" />
        </svg>
        <div className="absolute left-0 top-0 shadow-lg w-6 h-6 rounded-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-300 text-black font-bold text-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
