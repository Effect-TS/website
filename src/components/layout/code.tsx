'use client'

import {FC, useState} from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import hljs from 'highlight.js/lib/common'
import {Icon} from '../icons'

export const Code: FC<{
  tabs: {name: string; content: string; highlights?: {color: string; lines: number[]}[]}[]
  terminal?: {run: string; command: string; result: string}
  fixedHeight?: 80 | 96
}> = ({tabs, terminal, fixedHeight}) => {
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
        <div className={`${terminal ? 'pb-8' : ''} ${fixedHeight === 80 ? 'lg:h-80' : fixedHeight === 96 ? 'lg:h-96' : ''} max-h-96 overflow-y-auto`}>
          {tabs.map(({name, content, highlights}, index) => {
            const html = hljs.highlightAuto(content).value
            const lineCount = (html.match(/\n/g) || []).length + 1
            return (
              <Tabs.Content key={index} value={name} className="relative font-mono text-sm flex data-[state=inactive]:absolute">
                <ul className="absolute inset-0 text-zinc-600 py-3">
                  {[...new Array(lineCount)].map((e, i) => {
                    let backgroundColor = 'transparent'
                    highlights?.forEach((highlight) => {
                      if (highlight.lines.includes(i + 1)) {
                        backgroundColor = highlight.color
                      }
                    })
                    return (
                      <li key={i} className="relative">
                        <div className="absolute inset-y-0 left-0 w-full" style={{backgroundColor}} />
                        <span className="relative block w-12 pr-4 text-right">{i + 1}</span>
                      </li>
                    )
                  })}
                </ul>
                <div className="relative w-full py-3 pl-12">
                  <div className="w-full overflow-x-auto ">
                    {/* `contain: none` needed for horizontal scrolling to work */}
                    <pre style={{contain: 'none'}}>
                      <code dangerouslySetInnerHTML={{__html: html.replaceAll('\n', '<br/>')}} className="block" />
                    </pre>
                  </div>
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
