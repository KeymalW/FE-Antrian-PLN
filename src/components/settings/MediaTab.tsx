import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getMonitorVideos,
  getVideoLinks,
  uploadMonitorVideo,
  deleteAnyVideo,
  addVideoLink,
  getServerVideoVolume,
  setServerVideoVolume,
} from '../../services/settings'
import type { VideoData } from '../../services/settings'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  LinkIcon,
  MonitorPlayIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
  Volume2Icon,
} from 'lucide-react'

export function MediaTab() {
  const [videos, setVideos] = useState<VideoData[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [addingLink, setAddingLink] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [videoVolume, setVideoVolume] = useState(0.2)
  const [volumeSaving, setVolumeSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchVideos = useCallback(async () => {
    try {
      const [uploads, links] = await Promise.all([getMonitorVideos(), getVideoLinks()])
      setVideos([
        ...uploads.map((v) => ({ ...v, source: 'upload' as const })),
        ...links.map((v) => ({ ...v, source: 'link' as const })),
      ])
    } catch {
      toast.error('Gagal memuat daftar video')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchVideos()
      void getServerVideoVolume().then((v) => setVideoVolume(v))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchVideos])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await uploadMonitorVideo(file)
      await fetchVideos()
      toast.success('Video berhasil diupload')
    } catch {
      toast.error('Gagal mengupload video')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkUrl.trim()) return

    setAddingLink(true)
    try {
      await addVideoLink(linkUrl.trim(), linkTitle.trim())
      setLinkUrl('')
      setLinkTitle('')
      await fetchVideos()
      toast.success('Link video berhasil ditambahkan')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambahkan link video')
    } finally {
      setAddingLink(false)
    }
  }

  const handleDelete = async (video: VideoData) => {
    setDeletingId(video.id ?? video.filename)
    try {
      await deleteAnyVideo(video)
      await fetchVideos()
      toast.success('Video berhasil dihapus')
    } catch {
      toast.error('Gagal menghapus video')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorPlayIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Video TV Display
          </CardTitle>
          <CardDescription>
            Kelola video yang diputar di layar TV saat antrian tidak sedang dipanggil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-ring hover:bg-accent/60 hover:text-foreground"
          >
            <UploadIcon className="size-6" aria-hidden="true" />
            <span className="font-medium">
              {uploading ? 'Mengupload…' : 'Klik untuk upload video baru'}
            </span>
            <span className="text-[11px]">MP4, MOV, AVI, WMV, WEBM — maks 200MB</span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-ms-wmv,video/webm"
            className="hidden"
            onChange={handleFileSelect}
          />

          <form onSubmit={handleAddLink} className="grid gap-3 rounded-xl border border-border p-4">
            <Label className="text-sm font-medium">
              <LinkIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              Tambah dari Link (URL video langsung, cth. .mp4)
            </Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://contoh.com/video.mp4"
              required
              type="url"
            />
            <div className="flex gap-2">
              <Input
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Judul video (opsional)"
              />
              <Button type="submit" variant="outline" disabled={addingLink || !linkUrl.trim()}>
                {addingLink ? (
                  <RefreshCwIcon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                Tambah
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {loading ? (
              <p className="flex items-center gap-2 py-4 text-center text-sm text-muted-foreground">
                <RefreshCwIcon className="size-4 animate-spin" />
                Memuat daftar video…
              </p>
            ) : videos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada video. Upload file atau tambahkan link di atas.
              </p>
            ) : (
              videos.map((video) => (
                <div
                  key={video.id ?? video.filename}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <MonitorPlayIcon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {video.filename}
                      </div>
                      {video.url.startsWith('http') && (
                        <div className="truncate text-[11px] text-muted-foreground">{video.url}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={video.source === 'link' ? 'secondary' : 'outline'}
                      className="capitalize"
                    >
                      {video.source === 'link' ? 'Link' : 'Upload'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus ${video.filename}`}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void handleDelete(video)}
                      disabled={deletingId === (video.id ?? video.filename)}
                    >
                      {deletingId === (video.id ?? video.filename) ? (
                        <RefreshCwIcon className="animate-spin" />
                      ) : (
                        <Trash2Icon />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Volume2Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                Volume Video
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                {Math.round(videoVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={videoVolume}
              onChange={async (e) => {
                const v = Number(e.target.value)
                setVideoVolume(v)
                setVolumeSaving(true)
                try {
                  await setServerVideoVolume(v)
                } catch {
                  toast.error('Gagal menyimpan volume')
                } finally {
                  setVolumeSaving(false)
                }
              }}
              className="mt-2.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {videoVolume === 0
                ? 'Video akan senyap (mute)'
                : `Video akan diputar dengan volume ${Math.round(videoVolume * 100)}% — suara antrian tidak terganggu`}
              {volumeSaving && ' • Menyimpan...'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
