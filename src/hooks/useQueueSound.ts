import { useCallback, useRef } from 'react'
import type { QueueTicket } from '../types/queue'
import { getServiceLabel } from '../lib/serviceTypes'

export interface QueueSoundOptions {
  ttsRate?: number
  ttsPitch?: number
  ttsVolume?: number
}

let audioContext: AudioContext | null = null
let bellBuffer: AudioBuffer | null = null
let bellLoading = false

function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

async function preloadBell() {
  if (bellBuffer || bellLoading) return
  bellLoading = true
  try {
    const ctx = getAudioContext()
    const res = await fetch('/sounds/melodic-bell.wav')
    const arrayBuf = await res.arrayBuffer()
    bellBuffer = await ctx.decodeAudioData(arrayBuf)
  } catch {
    bellBuffer = null
  } finally {
    bellLoading = false
  }
}

export function useQueueSound(options?: QueueSoundOptions) {
  const announceTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const ttsRate = options?.ttsRate ?? 0.92
  const ttsPitch = options?.ttsPitch ?? 1
  const ttsVolume = options?.ttsVolume ?? 1

  type AnnouncementStep =
    | { kind: 'bell'; delay: number }
    | { kind: 'speak'; text: string; delay: number }

  const clearAnnouncementQueue = useCallback(() => {
    announceTimersRef.current.forEach((timer) => clearTimeout(timer))
    announceTimersRef.current = []
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'id-ID'
    utterance.rate = ttsRate
    utterance.pitch = ttsPitch
    utterance.volume = ttsVolume

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice =
      voices.find((voice) => voice.lang.toLowerCase().startsWith('id')) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ??
      voices[0]

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsRate, ttsPitch, ttsVolume])

  const playBellChime = useCallback(() => {
    try {
      const ctx = getAudioContext()
      if (ctx.state === 'suspended') return

      if (!bellBuffer) {
        preloadBell()
        return
      }

      const source = ctx.createBufferSource()
      const master = ctx.createGain()
      master.gain.value = 0.5
      source.buffer = bellBuffer
      source.connect(master)
      master.connect(ctx.destination)
      source.start(0)
    } catch {}
  }, [])

  const unlockAudio = useCallback(async () => {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

    preloadBell()

    try {
      const silent = new Audio()
      silent.volume = 0.01
      silent.play().catch(() => {})
    } catch {}
  }, [])

  const announceQueueCall = useCallback((ticket: Pick<QueueTicket, 'queueNumber' | 'counterNumber' | 'serviceType'>) => {
    if (typeof window === 'undefined') return

    clearAnnouncementQueue()

    const label = getServiceLabel(ticket.serviceType)

    const sequence: AnnouncementStep[] = [
      { kind: 'bell', delay: 0 },
      { kind: 'speak', text: 'Nomor antrian', delay: 650 },
      { kind: 'speak', text: ticket.queueNumber, delay: 500 },
      { kind: 'speak', text: 'silakan menuju loket', delay: 500 },
      { kind: 'speak', text: label, delay: 500 },
    ]

    sequence.forEach((item, index) => {
      const timer = setTimeout(() => {
        if (item.kind === 'bell') {
          playBellChime()
          return
        }

        speakText(item.text)
      }, sequence.slice(0, index).reduce((acc, curr) => acc + curr.delay, 0))
      announceTimersRef.current.push(timer)
    })
  }, [clearAnnouncementQueue, playBellChime, speakText])

  const playBeep = useCallback(() => {
    const ctx = getAudioContext()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = 800
    gain.gain.value = 0.3

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(0)
    osc.stop(ctx.currentTime + 0.15)
  }, [])

  return { playBeep, announceQueueCall, unlockAudio }
}
