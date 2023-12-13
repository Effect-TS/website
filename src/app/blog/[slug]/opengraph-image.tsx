import {allBlogPosts} from 'contentlayer/generated'
import {ImageResponse} from 'next/og'

export const runtime = 'edge'
export const alt = 'Effect'
export const size = {
  width: 1200,
  height: 630
}

export const contentType = 'image/png'

export default async function Image({params: {slug}}: {params: {slug: string}}) {
  const post = allBlogPosts.find((post) => post.urlPath === `/blog/${slug}`)!

  return new ImageResponse(
    (
      <div
        style={{
          backgroundImage: 'url(https://i.imgur.com/iBLRVtL.jpeg)',
          width: '100%',
          height: '100%',
          display: 'flex',
          gap: '64px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '0px 128px'
        }}
      >
        <img src="https://i.imgur.com/xB9LgVa.png" alt="Effect Logotype" width="298" height="64" />
        <div style={{color: 'white', fontSize: 64, fontFamily: 'CalSans'}}>{post.title}</div>
        <div style={{color: '#A1A1AB', fontSize: 32}}>{post.excerpt}</div>
        {/* <div style={{fontFamily: 'Cal Sans', color: '#ffffff', fontSize: 64}}>Test</div> */}
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Inter',
          data: await fetch(new URL('../../inter-light.ttf', import.meta.url)).then((res) => res.arrayBuffer()),
          style: 'normal',
          weight: 300
        },
        {
          name: 'CalSans',
          data: await fetch(new URL('../../cal-sans-semibold.ttf', import.meta.url)).then((res) => res.arrayBuffer()),
          style: 'normal',
          weight: 600
        }
      ]
    }
  )
}
