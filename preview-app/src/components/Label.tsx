import { FC } from 'react'
import classnames from 'classnames'

const themeClasses = {
  default: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  primary:
    'bg-blue-50 text-blue-400 border border-blue-100 dark:border-blue-900/90 dark:bg-blue-900/10 dark:text-blue-300',
}

export const Label: FC<{ text: string; theme?: 'default' | 'primary' }> = ({ text, theme = 'default' }) => {
  const sharedClasses =
    'inline-block leading-5 align-middle px-1.5 py-0.5 uppercase rounded-md tracking-wide [font-size:10px]'

  return <div className={classnames(sharedClasses, themeClasses[theme])}>{text}</div>
}
