"use client"
import { useState } from "react"
import { Card } from "../layout/card"
import Image from "next/image"
import { Icon } from "../icons"
import { track } from "@vercel/analytics"

export const Video = () => {
  const [showVideo, setShowVideo] = useState<boolean>(false)
  return (
    <div className="relative">
      <Card>
        {showVideo ? (
          <div className="aspect-video">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube-nocookie.com/embed/ViSiXfBKElQ?&autoplay=1`}
              loading="lazy"
              allowFullScreen
              title="Effect: Next-Generation TypeScript"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"
            />
          </div>
        ) : (
          <div className="relative aspect-video">
            <Image
              src="/images/video-thumbnail.jpg"
              alt="Effect: Next-Generation TypeScript"
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <button
                onClick={() => {
                  setShowVideo(true)
                  track("show-video")
                }}
                className="inline-flex h-10 rounded-xl p-px bg-gradient-to-br from-[#84B2E5] to-[#2F6EB1] shadow-lg"
              >
                <div className="flex h-full items-center gap-2 px-6 font-medium rounded-[11px] bg-gradient-to-br from-[#4B91DE] to-[#276AB2] text-white button-hover">
                  <Icon name="play" className="h-3.5" />
                  <span>Watch Video</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </Card>
      <div
        className="absolute -inset-y-64 w-32 left-1/2 rotate-45 bg-white/10 blur-3xl pointer-events-none"
        style={{ borderRadius: "50% 50%" }}
      />
    </div>
  )
}
