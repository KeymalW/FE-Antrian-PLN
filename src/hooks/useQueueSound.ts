import { useCallback, useRef } from 'react'
import type { QueueTicket } from '../types/queue'
import { getServiceLabel } from '../lib/serviceTypes'

export interface QueueSoundOptions {
  ttsRate?: number
  ttsPitch?: number
  ttsVolume?: number
}

let audioContext: AudioContext | null = null

function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export function useQueueSound(options?: QueueSoundOptions) {
  const playingRef = useRef(false)
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

      const master = ctx.createGain()
      master.gain.value = 0.18
      master.connect(ctx.destination)

      const now = ctx.currentTime
      const partials = [
        { freq: 660, gain: 0.35, decay: 2.5 },
        { freq: 880, gain: 0.65, decay: 1.8 },
        { freq: 1320, gain: 0.30, decay: 1.0 },
        { freq: 1760, gain: 0.20, decay: 0.6 },
        { freq: 2200, gain: 0.12, decay: 0.35 },
        { freq: 3080, gain: 0.06, decay: 0.2 },
      ]

      partials.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator()
        const gate = ctx.createGain()
        const filter = ctx.createBiquadFilter()

        osc.type = 'sine'
        osc.frequency.value = freq
        filter.type = 'lowpass'
        filter.frequency.value = Math.min(freq * 2.5, 8000)

        gate.gain.setValueAtTime(0.001, now)
        gate.gain.exponentialRampToValueAtTime(gain, now + 0.006)
        gate.gain.exponentialRampToValueAtTime(0.001, now + decay)

        osc.connect(filter)
        filter.connect(gate)
        gate.connect(master)
        osc.start(now)
        osc.stop(now + decay + 0.05)
      })
    } catch {}
  }, [])

  const unlockAudio = useCallback(async () => {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

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

  const playCallSound = useCallback(() => {
    if (playingRef.current) return
    playingRef.current = true

    const ctx = getAudioContext()

    const now = ctx.currentTime

    const master = ctx.createGain()
    master.gain.value = 0.18
    master.connect(ctx.destination)

    const freq = 880
    const osc = ctx.createOscillator()
    const gate = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq
    gate.gain.setValueAtTime(0.0001, now)
    gate.gain.exponentialRampToValueAtTime(0.8, now + 0.01)
    gate.gain.setValueAtTime(0.8, now + 0.12)
    gate.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)

    osc.connect(gate)
    gate.connect(master)
    osc.start(now)
    osc.stop(now + 0.3)

    const osc2 = ctx.createOscillator()
    const gate2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = freq * 1.5
    gate2.gain.setValueAtTime(0.0001, now + 0.3)
    gate2.gain.exponentialRampToValueAtTime(0.7, now + 0.31)
    gate2.gain.setValueAtTime(0.7, now + 0.42)
    gate2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)

    osc2.connect(gate2)
    gate2.connect(master)
    osc2.start(now + 0.3)
    osc2.stop(now + 0.6)

    setTimeout(() => { playingRef.current = false }, 700)
  }, [])

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

  return { playCallSound, playBeep, announceQueueCall, clearAnnouncementQueue, unlockAudio }
}
