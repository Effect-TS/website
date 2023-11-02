'use client'

import {FC, useState} from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import hljs from 'highlight.js/lib/common'
import {Icon} from '../icons'

export const Code: FC<{tabs: {name: string; content: string}[]; terminal?: {run: string; command: string; result: string}}> = ({tabs, terminal}) => {
  const [running, setRunning] = useState<boolean>(false)
  const runSnippet = () => {
    setRunning(true)
    setTimeout(() => setRunning(false), 1000)
  }

  return (
    <div className="w-full bg-gradient-to-br from-zinc-500 to-zinc-800 p-px rounded-xl overflow-hidden">
      <Tabs.Root defaultValue={tabs[0].name} className="bg-zinc-950 rounded-[11px] overflow-hidden">
        <div className="flex border-b border-zinc-800">
          <div className="h-10 flex items-center gap-2 px-3 border-r border-zinc-800">
            <div className="h-3 w-3 rounded-full bg-zinc-700" />
            <div className="h-3 w-3 rounded-full bg-zinc-700" />
            <div className="h-3 w-3 rounded-full bg-zinc-700" />
          </div>
          <Tabs.List className="flex">
            {tabs.map(({name}, index) => (
              <Tabs.Trigger
                key={index}
                value={name}
                className="h-10 px-3 flex items-center font-mono text-xs border-r border-zinc-800 data-[state=active]:text-white"
              >
                {name}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>
        <div className={`${terminal ? 'pb-8' : ''} max-h-96 overflow-y-auto`}>
          {tabs.map(({name, content}, index) => {
            const html = hljs.highlightAuto(content).value
            const lineCount = (html.match(/\n/g) || []).length + 1
            return (
              <Tabs.Content key={index} value={name} className="font-mono text-sm flex py-3 data-[state=inactive]:absolute">
                <ul className="text-zinc-600">
                  {[...new Array(lineCount)].map((e, i) => (
                    <li key={i} className="w-12 text-right pr-4">
                      {i + 1}
                    </li>
                  ))}
                </ul>
                <div className="overflow-x-auto">
                  <pre>
                    <code dangerouslySetInnerHTML={{__html: html.replaceAll('\n', '<br/>')}} />
                  </pre>
                </div>
              </Tabs.Content>
            )
          })}
        </div>
        {terminal && (
          <div className="relative border-t border-zinc-800 py-8">
            <button
              onClick={() => runSnippet()}
              className="absolute -top-5 left-12 inline-flex h-10 rounded-xl p-px bg-gradient-to-b from-white to-zinc-300 shadow-lg"
            >
              <div className="flex h-full items-center gap-2 px-6 font-medium rounded-[11px] bg-white text-black">
                <Icon name="play" className="h-3.5" />
                <span>{terminal.run}</span>
              </div>
            </button>
            <div className="font-mono text-white text-sm flex py-3 overflow-x-auto">
              <div className="text-zinc-600 w-12 shrink-0 text-right pr-4">$</div>
              <div>
                <div>{terminal.command}</div>
                <div className="relative">
                  <pre className={`${running ? 'opacity-0' : ''}`}>
                    <code>
                      <br />
                      {terminal.result}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </Tabs.Root>
    </div>
  )
}
