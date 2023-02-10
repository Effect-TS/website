import * as React from 'react'

export const Callout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <div className="mb-4 not-prose border-l-4 border-blue-400 p-4 bg-gray-800 rounded-sm">{children}</div>
}
