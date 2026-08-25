import api from './api'
import { get, post, put, del } from './api'
import { USE_MOCK_DATA } from '../mocks/mockMode'
import type { GeneralSettings, TicketTextSettings } from '../types/admin'

export interface VideoData {
  id?: string
  url: string
  filename: string
  source?: 'upload' | 'link'
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
  if (USE_MOCK_DATA) {
    const { mockGetVideoVolume } = await import('../mocks/mockBackend')
    return mockGetVideoVolume()
  }

  try {
    const res = await get<VideoVolumeData>('/settings/video-volume')
    return res.data?.volume ?? 0.2
  } catch {
    return 0.2
  }
}

export async function setServerVideoVolume(volume: number): Promise<void> {
  if (USE_MOCK_DATA) {
    const { mockSetVideoVolume } = await import('../mocks/mockBackend')
    return mockSetVideoVolume(volume)
  }

  await post('/settings/video-volume', { volume })
}

export async function getMonitorVideos(): Promise<VideoData[]> {
  if (USE_MOCK_DATA) {
    const { mockGetMonitorVideos } = await import('../mocks/mockBackend')
    return mockGetMonitorVideos()
  }

  const res = await get<VideoData[]>('/settings/videos')
  return res.data ?? []
}

export async function uploadMonitorVideo(file: File): Promise<VideoData> {
  if (USE_MOCK_DATA) {
    const { mockUploadMonitorVideo } = await import('../mocks/mockBackend')
    return mockUploadMonitorVideo(file)
  }

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
  if (USE_MOCK_DATA) {
    const { mockDeleteMonitorVideo } = await import('../mocks/mockBackend')
    return mockDeleteMonitorVideo(filename)
  }

  await del(`/settings/videos/${encodeURIComponent(filename)}`)
}

export async function addVideoLink(url: string, title: string): Promise<VideoData> {
  if (USE_MOCK_DATA) {
    const { mockAddVideoLink } = await import('../mocks/mockBackend')
    return mockAddVideoLink(url, title)
  }

  const res = await post<VideoData>('/settings/video-links', { url, title })
  return res.data
}

export async function getVideoLinks(): Promise<VideoData[]> {
  if (USE_MOCK_DATA) {
    const { mockGetVideoLinks } = await import('../mocks/mockBackend')
    return mockGetVideoLinks()
  }

  const res = await get<VideoData[]>('/settings/video-links')
  return res.data ?? []
}

export async function deleteVideoLink(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const { mockDeleteVideoLink } = await import('../mocks/mockBackend')
    return mockDeleteVideoLink(id)
  }

  await del(`/settings/video-links/${encodeURIComponent(id)}`)
}

export async function deleteAnyVideo(video: VideoData): Promise<void> {
  if (video.source === 'link' && video.id) {
    return deleteVideoLink(video.id)
  }
  return deleteMonitorVideo(video.filename)
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  if (USE_MOCK_DATA) {
    const { mockGetGeneralSettings } = await import('../mocks/mockBackend')
    return mockGetGeneralSettings()
  }

  const res = await get<GeneralSettings>('/settings/general')
  return res.data
}

export async function updateGeneralSettings(
  patch: Partial<GeneralSettings>,
): Promise<GeneralSettings> {
  if (USE_MOCK_DATA) {
    const { mockUpdateGeneralSettings } = await import('../mocks/mockBackend')
    return mockUpdateGeneralSettings(patch)
  }

  const res = await put<GeneralSettings>('/settings/general', patch)
  return res.data
}

function readLogoAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Gagal membaca file logo'))
    reader.readAsDataURL(file)
  })
}

const MAX_LOGO_SIZE = 512 * 1024

export async function uploadLogo(file: File): Promise<GeneralSettings> {
  if (file.size > MAX_LOGO_SIZE) {
    throw new Error('Ukuran logo maksimal 512KB')
  }

  if (USE_MOCK_DATA) {
    const dataUrl = await readLogoAsDataUrl(file)
    const { mockUpdateGeneralSettings } = await import('../mocks/mockBackend')
    return mockUpdateGeneralSettings({ logoUrl: dataUrl })
  }

  const formData = new FormData()
  formData.append('logo', file)

  const { data } = await api.post('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  if (!data.success) {
    throw new Error(data.message ?? 'Gagal mengupload logo')
  }

  return data.data as GeneralSettings
}

export async function getTicketTextSettings(): Promise<TicketTextSettings> {
  if (USE_MOCK_DATA) {
    const { mockGetTicketText } = await import('../mocks/mockBackend')
    return mockGetTicketText()
  }

  const res = await get<TicketTextSettings>('/settings/ticket-text')
  return res.data
}

export async function updateTicketTextSettings(
  patch: Partial<TicketTextSettings>,
): Promise<TicketTextSettings> {
  if (USE_MOCK_DATA) {
    const { mockUpdateTicketText } = await import('../mocks/mockBackend')
    return mockUpdateTicketText(patch)
  }

  const res = await post<TicketTextSettings>('/settings/ticket-text', patch)
  return res.data
}
