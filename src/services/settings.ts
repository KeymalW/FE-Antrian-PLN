import api from './api'
import { get, del } from './api'

export interface VideoData {
  url: string
  filename: string
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
