import {FC} from 'react'
import {useMDXComponent} from 'next-contentlayer/hooks'

export const MDX: FC<{content: string}> = ({content}) => {
  const Content = useMDXComponent(content)

  return (
    <div className="prose prose-invert text-zinc-400">
      <Content />
    </div>
  )
}
