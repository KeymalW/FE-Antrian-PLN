import { useState } from 'react'
import { Film } from 'lucide-react'

interface VideoPlayerProps {
  src?: string
  className?: string
  loop?: boolean
  onEnded?: () => void
}

export function VideoPlayer({ src, className = '', loop = true, onEnded }: VideoPlayerProps) {
  const [hasError, setHasError] = useState(false)

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
        key={src}
        className="h-full w-full object-cover"
        src={src}
        autoPlay
        muted
        loop={loop}
        playsInline
        onError={() => setHasError(true)}
        onEnded={onEnded}
      />
    </div>
  )
}
