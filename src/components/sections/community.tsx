import Link from 'next/link'
import {Glow} from '../layout/glow'
import Image from 'next/image'
import {Icon} from '../icons'
import {Button} from '../atoms/button'
import {Badge} from '../atoms/badge'

const content = {
  heading: 'Join our welcoming community',
  cta: {
    secondary: {
      href: 'https://github.com/Effect-TS/effect/graphs/contributors',
      text: 'See all contributors'
    },
    primary: {
      href: 'https://discord.gg/effect-ts',
      text: 'Join Discord'
    }
  },
  discord: {
    members: '2000+ community members', // TODO use Discord API
    online: '205 currently online' // TODO use Discord API
  },
  // TODO use images automatically from GitHub / Discord
  members: {
    top: [
      {avatar: 'https://avatars.githubusercontent.com/u/286577?s=150&v=4', rank: 0, size: 'sm', position: 'center'},
      {avatar: 'https://avatars.githubusercontent.com/u/878912?s=150&v=4', rank: 4, size: 'md', position: 'top'},
      {avatar: 'https://avatars.githubusercontent.com/u/40680?s=150&v=4', rank: 1, size: 'lg', position: 'bottom'},
      {avatar: 'https://avatars.githubusercontent.com/u/38051499?s=150&v=4', rank: 0, size: 'sm', position: 'center'},
      {avatar: 'https://avatars.githubusercontent.com/u/539577?s=150&v=4', rank: 2, size: 'lg', position: 'top'},
      {avatar: 'https://avatars.githubusercontent.com/u/24249610?s=150&v=4', rank: 5, size: 'md', position: 'bottom'},
      {avatar: 'https://avatars.githubusercontent.com/u/20319430?s=150&v=4', rank: 0, size: 'sm', position: 'top'},
      {avatar: 'https://avatars.githubusercontent.com/u/1172528?s=150&v=4', rank: 0, size: 'md', position: 'bottom'},
      {avatar: 'https://avatars.githubusercontent.com/u/13787614?s=150&v=4', rank: 8, size: 'md', position: 'top'},
      {avatar: 'https://avatars.githubusercontent.com/u/87831824?s=150&v=4', rank: 0, size: 'sm', position: 'center'}
    ],
    left: [
      {avatar: 'https://avatars.githubusercontent.com/u/42661?s=150&v=4', rank: 7, size: 'md', position: 'top'},
      {avatar: 'https://avatars.githubusercontent.com/u/5595092?s=150&v=4', rank: 0, size: 'sm', position: 'bottom'},
      {avatar: 'https://avatars.githubusercontent.com/u/356257?s=150&v=4', rank: 6, size: 'md', position: 'center'}
    ],
    right: [
      {avatar: 'https://avatars.githubusercontent.com/u/6271474?s=150&v=4', rank: 3, size: 'md', position: 'center'},
      {avatar: 'https://avatars.githubusercontent.com/u/22938931?s=150&v=4', rank: 0, size: 'sm', position: 'top'}
    ]
  }
}

export const Community = () => {
  return (
    <section className="relative">
      <Glow direction="down" />
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-32">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white text-center mb-16">{content.heading}</h2>
        <div>
          <div className="h-28 flex justify-between">
            {content.members.top.map(({avatar, rank, size, position}, index) => (
              <div key={index} className={`h-full flex ${position === 'top' ? 'items-start' : position === 'center' ? 'items-center' : 'items-end'}`}>
                <div className={`relative ${size === 'lg' ? 'h-20 w-20' : size === 'md' ? 'h-14 w-14' : 'h-8 w-8'}`}>
                  <div className="relative w-full h-full overflow-hidden rounded-full border border-white shadow-lg">
                    <Image src={avatar} alt="Community member" fill />
                  </div>
                  {rank > 0 && (
                    <Badge className={`absolute ${size === 'lg' ? '-right-1 -top-1' : size === 'md' ? '-right-2 -top-2' : '-right-4 -top-4'}`}>
                      {rank}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex">
            <div className="w-2/5">
              <div className="flex justify-around h-24">
                {content.members.left.map(({avatar, rank, size, position}, index) => (
                  <div key={index} className={`h-full flex ${position === 'top' ? 'items-start' : position === 'center' ? 'items-center' : 'items-end'}`}>
                    <div className={`relative ${size === 'lg' ? 'h-20 w-20' : size === 'md' ? 'h-14 w-14' : 'h-8 w-8'}`}>
                      <div className="relative w-full h-full overflow-hidden rounded-full border border-white shadow-lg">
                        <Image src={avatar} alt="Community member" fill />
                      </div>
                      {rank > 0 && (
                        <Badge className={`absolute ${size === 'lg' ? '-right-1 -top-1' : size === 'md' ? '-right-2 -top-2' : '-right-4 -top-4'}`}>
                          {rank}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-8 w-1/5 flex flex-col items-center">
              <Link href={content.cta.secondary.href} className="flex items-start justify-center text-white mb-4">
                <span>{content.cta.secondary.text}</span>
                <Icon name="arrow-up-right-light" className="h-3.5 mt-0.5 ml-0.5" />
              </Link>
              <Button href={content.cta.primary.href}>{content.cta.primary.text}</Button>
              <div className="text-sm flex flex-col items-center mt-4">
                <p>{content.discord.members}</p>
                <p className="flex items-center gap-1">
                  <span className="animate-pulse h-3 w-3 bg-emerald-800 rounded-full flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  </span>
                  {content.discord.online}
                </p>
              </div>
            </div>
            <div className="w-2/5">
              <div className="flex justify-around h-24">
                {content.members.right.map(({avatar, rank, size, position}, index) => (
                  <div key={index} className={`h-full flex ${position === 'top' ? 'items-start' : position === 'center' ? 'items-center' : 'items-end'}`}>
                    <div className={`relative ${size === 'lg' ? 'h-20 w-20' : size === 'md' ? 'h-14 w-14' : 'h-8 w-8'}`}>
                      <div className="relative w-full h-full overflow-hidden rounded-full border border-white shadow-lg">
                        <Image src={avatar} alt="Community member" fill />
                      </div>
                      {rank > 0 && (
                        <Badge className={`absolute ${size === 'lg' ? '-right-1 -top-1' : size === 'md' ? '-right-2 -top-2' : '-right-4 -top-4'}`}>
                          {rank}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
