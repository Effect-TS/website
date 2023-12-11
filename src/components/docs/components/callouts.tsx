import React from 'react'

export const Idea: React.FC<React.PropsWithChildren<{}>> = ({children}) => {
  return <div className='overflow-x-auto mt-6 flex rounded-lg border py-2 ltr:pr-4 rtl:pl-4 contrast-more:border-current contrast-more:dark:border-current border-orange-100 bg-orange-50 text-orange-800 dark:border-orange-400/30 dark:bg-orange-400/20 dark:text-orange-300'>{children}</div>
}

export const Design: React.FC<React.PropsWithChildren<{}>> = ({children}) => {
  return <div className='overflow-x-auto mt-6 flex rounded-lg border py-2 ltr:pr-4 rtl:pl-4 contrast-more:border-current contrast-more:dark:border-current border-orange-100 bg-orange-50 text-orange-800 dark:border-orange-400/30 dark:bg-orange-400/20 dark:text-orange-300'>{children}</div>
}

export const Warning: React.FC<React.PropsWithChildren<{}>> = ({children}) => {
  return <div className='overflow-x-auto mt-6 flex rounded-lg border py-2 ltr:pr-4 rtl:pl-4 contrast-more:border-current contrast-more:dark:border-current border-orange-100 bg-orange-50 text-orange-800 dark:border-orange-400/30 dark:bg-orange-400/20 dark:text-orange-300'>{children}</div>
}

export const Info: React.FC<React.PropsWithChildren<{}>> = ({children}) => {
  return <div className='overflow-x-auto mt-6 flex rounded-lg border py-2 ltr:pr-4 rtl:pl-4 contrast-more:border-current contrast-more:dark:border-current border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-200/30 dark:bg-blue-900/30 dark:text-blue-200'>{children}</div>
}

export const Error: React.FC<React.PropsWithChildren<{}>> = ({children}) => {
  return <div className='overflow-x-auto mt-6 flex rounded-lg border py-2 ltr:pr-4 rtl:pl-4 contrast-more:border-current contrast-more:dark:border-current border-red-200 bg-red-100 text-red-900 dark:border-red-200/30 dark:bg-red-900/30 dark:text-red-200'>{children}</div>
}