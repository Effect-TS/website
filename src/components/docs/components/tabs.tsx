'use client';

import { Tab as HeadlessTab } from '@headlessui/react'
import cn from 'clsx'
import type { ComponentProps, ReactElement, ReactNode } from 'react'
import React from 'react';
import { useCallback, useEffect, useState } from 'react'

type TabItem = string | ReactNode

type TabObjectItem = {
  label: TabItem
  disabled: boolean
}

function isTabObjectItem(item: unknown): item is TabObjectItem {
  return !!item && typeof item === 'object' && 'label' in item
}

function _Tabs({
  items,
  selectedIndex: _selectedIndex,
  defaultIndex = 0,
  onChange,
  children,
  storageKey
}: {
  items?: (TabItem | TabObjectItem)[]
  selectedIndex?: number
  defaultIndex?: number
  onChange?: (index: number) => void
  children: ReactNode
  storageKey?: string
}): ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex)

  useEffect(() => {
    if (_selectedIndex !== undefined) {
      setSelectedIndex(_selectedIndex)
    }
  }, [_selectedIndex])

  useEffect(() => {
    if (!storageKey) {
      // Do not listen storage events if there is no storage key
      return
    }

    function fn(event: StorageEvent) {
      if (event.key === storageKey) {
        setSelectedIndex(Number(event.newValue))
      }
    }

    const index = Number(localStorage.getItem(storageKey))
    setSelectedIndex(Number.isNaN(index) ? 0 : index)

    window.addEventListener('storage', fn)
    return () => {
      window.removeEventListener('storage', fn)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- only on mount

  const handleChange = useCallback((index: number) => {
    if (storageKey) {
      const newValue = String(index)
      localStorage.setItem(storageKey, newValue)

      // the storage event only get picked up (by the listener) if the localStorage was changed in
      // another browser's tab/window (of the same app), but not within the context of the current tab.
      window.dispatchEvent(
        new StorageEvent('storage', { key: storageKey, newValue })
      )
      return
    }
    setSelectedIndex(index)
    onChange?.(index)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- only on mount

  const itemsWithFallback = React.useMemo(() => {
    return items ?? (Array.isArray(children) ? Array.from({length:children.length }, (_, i)  => `Tab ${i}`) : [])
  }, [children, items])

  return (
    <HeadlessTab.Group
      selectedIndex={selectedIndex}
      defaultIndex={defaultIndex}
      onChange={handleChange}
    >
      <div className="overflow-x-auto overflow-y-hidden overscroll-x-contain">
        <HeadlessTab.List className="mt-4 flex w-max min-w-full border-b border-gray-200 pb-px dark:border-neutral-800">
          {itemsWithFallback.map((item, index) => {
            const disabled = isTabObjectItem(item) && item.disabled
            return (
              <HeadlessTab
                key={index}
                disabled={disabled}
                className={({ selected }) =>
                  cn(
                    'mr-2 rounded-t p-2 font-medium leading-5 transition-colors',
                    '-mb-0.5 select-none border-b-2',
                    selected
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-600 hover:border-gray-200 hover:text-black dark:text-gray-200 dark:hover:border-neutral-800 dark:hover:text-white',
                    disabled &&
                      'pointer-events-none text-gray-400 dark:text-neutral-600'
                  )
                }
              >
                {isTabObjectItem(item) ? item.label : item}
              </HeadlessTab>
            )
          })}
        </HeadlessTab.List>
      </div>
      <HeadlessTab.Panels>{children}</HeadlessTab.Panels>
    </HeadlessTab.Group>
  )
}

export function Tab({
  children,
  ...props
}: ComponentProps<typeof HeadlessTab.Panel>): ReactElement {
  return (
    <HeadlessTab.Panel {...props} className="rounded pt-6">
      {children}
    </HeadlessTab.Panel>
  )
}

export const Tabs = Object.assign(_Tabs, { displayName: 'Tabs', Tab })