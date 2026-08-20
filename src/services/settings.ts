import api from './api'
import { get, post, del } from './api'

export interface VideoData {
  url: string
  filename: string
}

export interface VideoVolumeData {
  volume: number
}

const VOLUME_LOCAL_KEY = 'monitor-video-volume'

export function getLocalVideoVolume(): number {
  try {
    const stored = localStorage.getItem(VOLUME_LOCAL_KEY)
    if (stored !== null) {
      const v = Number(stored)
      return v >= 0 && v <= 1 ? v : 0.2
    }
  } catch {
    // localStorage tidak tersedia (private mode) — pakai default
  }
  return 0.2
}

export function setLocalVideoVolume(volume: number): void {
  try {
    localStorage.setItem(VOLUME_LOCAL_KEY, String(Math.max(0, Math.min(1, volume))))
  } catch {
    // localStorage tidak tersedia (private mode) — abaikan
  }
}

export async function getServerVideoVolume(): Promise<number> {
  try {
    const res = await get<VideoVolumeData>('/settings/video-volume')
    return res.data?.volume ?? 0.2
  } catch {
    return 0.2
  }
}

export async function setServerVideoVolume(volume: number): Promise<void> {
  await post('/settings/video-volume', { volume })
}

export async function getMonitorVideos(): Promise<VideoData[]> {
  const res = await get<VideoData[]>('/settings/videos')
  return res.data ?? []
}

export async function uploadMonitorVideo(file: File): Promise<VideoData> {
  const formData = new FormData()
  formData.append('video', file)

  const { data } = await api.post('/settings/videos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  if (!data.success) {
    throw new Error(data.message ?? 'Gagal mengupload video')
  }

  return data.data
}

export async function deleteMonitorVideo(filename: string): Promise<void> {
  await del(`/settings/videos/${encodeURIComponent(filename)}`)
}
