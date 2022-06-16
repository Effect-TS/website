import React from 'react'
import ReactPlayer from "react-player/lazy"

export function Player(_: { url: string }) {
    return <div>
        <ReactPlayer
            url={_.url}
            controls={true}
            width="100%"
            height="100%"
            config={{
                vimeo: {
                    playerOptions: {
                        responsive: true
                    }
                }
            }} />
    </div>
}