import Link from 'next/link'
import {Glow} from '../layout/glow'
import Image from 'next/image'
import {Icon} from '../icons'
import {Button} from '../atoms/button'
import {Badge} from '../atoms/badge'

const content = {
  heading: 'Join our growing community',
  cta: {
    secondary: {
      href: '/',
      text: 'See all contributors'
    },
    primary: {
      href: '/',
      text: 'Join Discord'
    }
  },
  discord: {
    members: '2000+ community members',
    online: '205 currently online'
  },
  members: {
    top: [
      {avatar: 'https://i.pravatar.cc/150?img=60', rank: 0, size: 'sm', position: 'center'},
      {avatar: 'https://i.pravatar.cc/150?img=58', rank: 4, size: 'md', position: 'top'},
      {avatar: 'https://i.pravatar.cc/150?img=17', rank: 1, size: 'lg', position: 'bottom'},
      {avatar: 'https://i.pravatar.cc/150?img=39', rank: 0, size: 'sm', position: 'center'},
      {avatar: 'https://i.pravatar.cc/150?img=27', rank: 2, size: 'lg', position: 'top'},
      {avatar: 'https://i.pravatar.cc/150?img=54', rank: 5, size: 'md', position: 'bottom'},
      {avatar: 'https://i.pravatar.cc/150?img=41', rank: 0, size: 'sm', position: 'top'},
      {avatar: 'https://i.pravatar.cc/150?img=54', rank: 0, size: 'md', position: 'bottom'},
      {avatar: 'https://i.pravatar.cc/150?img=12', rank: 8, size: 'md', position: 'top'},
      {avatar: 'https://i.pravatar.cc/150?img=35', rank: 0, size: 'sm', position: 'center'}
    ],
    left: [
      {avatar: 'https://i.pravatar.cc/150?img=60', rank: 7, size: 'md', position: 'top'},
      {avatar: 'https://i.pravatar.cc/150?img=58', rank: 0, size: 'sm', position: 'bottom'},
      {avatar: 'https://i.pravatar.cc/150?img=17', rank: 6, size: 'md', position: 'center'}
    ],
    right: [
      {avatar: 'https://i.pravatar.cc/150?img=58', rank: 3, size: 'md', position: 'center'},
      {avatar: 'https://i.pravatar.cc/150?img=17', rank: 0, size: 'sm', position: 'top'}
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
              <div
                key={index}
                className={`${index > content.members.top.length / 2 - 1 ? 'hidden sm:flex' : ''} h-full flex ${
                  position === 'top' ? 'items-start' : position === 'center' ? 'items-center' : 'items-end'
                }`}
              >
                <div className={`relative ${size === 'lg' ? 'h-16 sm:h-20 w-16 sm:w-20' : size === 'md' ? 'h-14 w-14' : 'h-8 w-8'}`}>
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
          <div className="sm:hidden h-28 flex justify-between">
            {content.members.top.map(({avatar, rank, size, position}, index) => {
              if (index > content.members.top.length / 2 - 1)
                return (
                  <div key={index} className={`h-full flex ${position === 'top' ? 'items-start' : position === 'center' ? 'items-center' : 'items-end'}`}>
                    <div className={`relative ${size === 'lg' ? 'h-16 sm:h-20 w-16 sm:w-20' : size === 'md' ? 'h-14 w-14' : 'h-8 w-8'}`}>
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
                )
            })}
          </div>
          <div className="flex mt-8 sm:mt-0">
            <div className="grow sm:w-1/3 lg:w-2/5">
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
            <div className="pt-8 sm:w-1/3 lg:w-1/5 hidden sm:flex flex-col items-center">
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
            <div className="grow sm:w-1/3 lg:w-2/5">
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
          <div className="pt-8 sm:w-1/3 lg:w-1/5 sm:hidden flex flex-col items-center">
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
        </div>
      </div>
    </section>
  )
}
