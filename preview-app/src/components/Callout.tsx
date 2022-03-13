import { FC } from 'react'

export const Callout: FC = ({ children }) => {
  return <div className="mb-4 border-l-4 border-blue-400 p-4 bg-gray-800 rounded-sm">{children}</div>
}
