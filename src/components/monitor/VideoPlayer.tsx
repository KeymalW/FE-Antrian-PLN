import { useState } from 'react'
import { Film } from 'lucide-react'

interface VideoPlayerProps {
  src?: string
  youtubeIds?: string[]
  className?: string
}

export function VideoPlayer({ src, youtubeIds, className = '' }: VideoPlayerProps) {
  const [hasError, setHasError] = useState(false)

  if (youtubeIds && youtubeIds.length > 0) {
    const playerIds = youtubeIds.filter(Boolean)
    const embedId = playerIds[0]
    const playlist = playerIds.join(',')

    return (
      <div className={`relative overflow-hidden rounded-2xl ring-1 ring-pln-cyan/20 shadow-[0_0_30px_rgba(20,162,186,0.15)] ${className}`}>
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${embedId}?autoplay=1&mute=1&loop=1&playlist=${playlist}&controls=0&disablekb=1&modestbranding=1&rel=0&iv_load_policy=3`}
          allow="autoplay; encrypted-media"
        />
        <div className="absolute inset-0 z-10" />
      </div>
    )
  }

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-pln-teal/30 via-gray-800/60 to-gray-800/60 ring-1 ring-pln-cyan/20 backdrop-blur ${className}`}
      >
        <div className="flex flex-col items-center gap-4 text-pln-cyan/50">
          <Film className="size-20" />
          <span className="text-xl font-medium">Video Promosi</span>
          <span className="text-sm text-white/30">
            {hasError ? 'Video tidak dapat dimuat' : 'Belum ada video'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl ring-1 ring-pln-cyan/20 shadow-[0_0_30px_rgba(20,162,186,0.15)] ${className}`}
    >
      <video
        className="h-full w-full object-cover"
        src={src}
        autoPlay
        muted
        loop
        playsInline
        onError={() => setHasError(true)}
      />
    </div>
  )
}
