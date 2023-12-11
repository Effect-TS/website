import {FC} from 'react'
import {useMDXComponent} from 'next-contentlayer/hooks'
import {H2, H3, H4} from '@/components/atoms/headings'
import { Tab, Tabs } from '@/components/docs/components/tabs'
import * as Callouts from '@/components/docs/components/callouts'

export const MDX: FC<{content: string}> = ({content}) => {
  const Content = useMDXComponent(content)

  return (
    <div className="relative prose prose-invert text-zinc-400">
      <Content
        components={{
          h2: H2,
          h3: H3,
          h4: H4,
          Tab,
          Tabs,
          ...Callouts,
        }}
      />
    </div>
  )
}
