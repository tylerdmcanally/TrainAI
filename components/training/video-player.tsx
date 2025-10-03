'use client'

import MuxPlayer from '@mux/mux-player-react'

interface VideoPlayerProps {
  playbackId: string
  title?: string
  poster?: string
}

export function VideoPlayer({ playbackId, title, poster }: VideoPlayerProps) {
  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <MuxPlayer
        streamType="on-demand"
        playbackId={playbackId}
        metadata={{
          video_title: title || 'Training Video',
        }}
        poster={poster}
        className="w-full h-full"
        accentColor="#2563eb"
      />
    </div>
  )
}
