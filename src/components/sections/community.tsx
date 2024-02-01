"use server"

import Link from "next/link"
import { Glow } from "../layout/glow"
import Image from "next/image"
import { Icon } from "../icons"
import { Button } from "../atoms/button"

const content = {
  heading: "Join our welcoming community",
  cta: {
    secondary: {
      href: "https://github.com/Effect-TS/effect/graphs/contributors",
      text: "See all contributors"
    },
    primary: {
      href: "https://discord.gg/effect-ts",
      text: "Join Discord"
    }
  },
  // TODO use images automatically from GitHub / Discord
  members: {
    top: [
      {
        avatar: "https://avatars.githubusercontent.com/u/286577?s=150&v=4",
        size: "sm",
        position: "center"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/878912?s=150&v=4",
        size: "md",
        position: "top"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/40680?s=150&v=4",
        size: "lg",
        position: "bottom"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/38051499?s=150&v=4",
        size: "sm",
        position: "center"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/539577?s=150&v=4",
        size: "lg",
        position: "top"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/24249610?s=150&v=4",
        size: "md",
        position: "bottom"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/20319430?s=150&v=4",
        size: "sm",
        position: "top"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/1172528?s=150&v=4",
        size: "md",
        position: "bottom"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/13787614?s=150&v=4",
        size: "md",
        position: "top"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/87831824?s=150&v=4",
        size: "sm",
        position: "center"
      }
    ],
    left: [
      {
        avatar: "https://avatars.githubusercontent.com/u/42661?s=150&v=4",
        size: "md",
        position: "top"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/5595092?s=150&v=4",
        size: "sm",
        position: "bottom"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/356257?s=150&v=4",
        size: "md",
        position: "center"
      }
    ],
    right: [
      {
        avatar: "https://avatars.githubusercontent.com/u/6271474?s=150&v=4",
        size: "md",
        position: "center"
      },
      {
        avatar: "https://avatars.githubusercontent.com/u/22938931?s=150&v=4",
        size: "sm",
        position: "top"
      }
    ]
  }
}

export const Community = async () => {
  const avatars = await discordAvatars(20)

  return (
    <section className="relative">
      <Glow direction="down" />
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-32">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white text-center mb-16">
          {content.heading}
        </h2>
        <div>
          <div className="h-28 flex justify-between">
            {content.members.top.map(({ avatar, size, position }, index) => (
              <div
                key={index}
                className={`${
                  index > content.members.top.length / 2 - 1
                    ? "hidden sm:flex"
                    : ""
                } h-full flex ${
                  position === "top"
                    ? "items-start"
                    : position === "center"
                      ? "items-center"
                      : "items-end"
                }`}
              >
                <div
                  className={`relative ${
                    size === "lg"
                      ? "h-16 sm:h-20 w-16 sm:w-20"
                      : size === "md"
                        ? "h-14 w-14"
                        : "h-8 w-8"
                  }`}
                >
                  <div className="relative w-full h-full overflow-hidden rounded-full border border-white shadow-lg">
                    <Image
                      src={avatars[index] ?? avatar}
                      alt="Community member"
                      fill
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="sm:hidden h-28 flex justify-between">
            {content.members.top.map(({ avatar, size, position }, index) => {
              if (index > content.members.top.length / 2 - 1)
                return (
                  <div
                    key={index}
                    className={`h-full flex ${
                      position === "top"
                        ? "items-start"
                        : position === "center"
                          ? "items-center"
                          : "items-end"
                    }`}
                  >
                    <div
                      className={`relative ${
                        size === "lg"
                          ? "h-16 sm:h-20 w-16 sm:w-20"
                          : size === "md"
                            ? "h-14 w-14"
                            : "h-8 w-8"
                      }`}
                    >
                      <div className="relative w-full h-full overflow-hidden rounded-full border border-white shadow-lg">
                        <Image
                          src={avatars[index] ?? avatar}
                          alt="Community member"
                          fill
                        />
                      </div>
                    </div>
                  </div>
                )
            })}
          </div>
          <div className="flex mt-8 sm:mt-0">
            <div className="grow sm:w-1/3 lg:w-2/5">
              <div className="flex justify-around h-24">
                {content.members.left.map(
                  ({ avatar, size, position }, index) => (
                    <div
                      key={index}
                      className={`h-full flex ${
                        position === "top"
                          ? "items-start"
                          : position === "center"
                            ? "items-center"
                            : "items-end"
                      }`}
                    >
                      <div
                        className={`relative ${
                          size === "lg"
                            ? "h-20 w-20"
                            : size === "md"
                              ? "h-14 w-14"
                              : "h-8 w-8"
                        }`}
                      >
                        <div className="relative w-full h-full overflow-hidden rounded-full border border-white shadow-lg">
                          <Image
                            src={
                              avatars[index + content.members.top.length] ??
                              avatar
                            }
                            alt="Community member"
                            fill
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="pt-8 sm:w-1/3 lg:w-1/5 hidden sm:flex flex-col items-center">
              <Link
                href={content.cta.secondary.href}
                className="flex items-start justify-center text-white mb-4"
              >
                <span>{content.cta.secondary.text}</span>
                <Icon
                  name="arrow-up-right-light"
                  className="h-3.5 mt-0.5 ml-0.5"
                />
              </Link>
              <Button href={content.cta.primary.href} external>
                {content.cta.primary.text}
              </Button>
              <div className="text-sm flex flex-col items-center mt-4">
                <DiscordStats />
              </div>
            </div>
            <div className="grow sm:w-1/3 lg:w-2/5">
              <div className="flex justify-around h-24">
                {content.members.right.map(
                  ({ avatar, size, position }, index) => (
                    <div
                      key={index}
                      className={`h-full flex ${
                        position === "top"
                          ? "items-start"
                          : position === "center"
                            ? "items-center"
                            : "items-end"
                      }`}
                    >
                      <div
                        className={`relative ${
                          size === "lg"
                            ? "h-20 w-20"
                            : size === "md"
                              ? "h-14 w-14"
                              : "h-8 w-8"
                        }`}
                      >
                        <div className="relative w-full h-full overflow-hidden rounded-full border border-white shadow-lg">
                          <Image
                            src={
                              avatars[
                                index +
                                  content.members.top.length +
                                  content.members.left.length
                              ] ?? avatar
                            }
                            alt="Community member"
                            fill
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
          <div className="pt-8 sm:w-1/3 lg:w-1/5 sm:hidden flex flex-col items-center">
            <Link
              href={content.cta.secondary.href}
              className="flex items-start justify-center text-white mb-4"
            >
              <span>{content.cta.secondary.text}</span>
              <Icon
                name="arrow-up-right-light"
                className="h-3.5 mt-0.5 ml-0.5"
              />
            </Link>
            <Button href={content.cta.primary.href} external>
              {content.cta.primary.text}
            </Button>
            <div className="text-sm flex flex-col items-center mt-4">
              <DiscordStats />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

async function DiscordStats() {
  const guild = await discordStats()
  return (
    <>
      <p>{guild.approximate_member_count}+ community members</p>
      <p className="flex items-center gap-1">
        <span className="animate-pulse h-3 w-3 bg-emerald-800 rounded-full flex items-center justify-center">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
        </span>
        {guild.approximate_presence_count} currently online
      </p>
    </>
  )
}

async function discordStats() {
  let guild = {
    approximate_member_count: 2000,
    approximate_presence_count: 305
  }

  try {
    const res = await fetch(
      "https://discord.com/api/v10/guilds/795981131316985866?with_counts=true",
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
        },
        next: { revalidate: 3600 }
      }
    )
    if (!res.ok) throw new Error()
    guild = await res.json()
  } catch (e) {}

  return guild
}

async function discordAvatars(count = 15) {
  try {
    const res = await fetch(
      "https://discord.com/api/v10/guilds/795981131316985866/widget.json",
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error()
    const members = (await res.json()).members as Array<{
      readonly id: string
      readonly username: string
      readonly discriminator: string
      readonly avatar_url: string
    }>

    // shuffle and return
    return members
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map((member) => member.avatar_url)
  } catch (e) {
    return []
  }
}
