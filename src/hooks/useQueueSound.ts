import { useCallback, useRef } from 'react'
import type { QueueTicket } from '../types/queue'

const SOUND_URL = import.meta.env.VITE_SOUND_URL ?? '/sounds/call.mp3'

let audioContext: AudioContext | null = null

function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export function useQueueSound() {
  const playingRef = useRef(false)
  const announceTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

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
    utterance.rate = 0.92
    utterance.pitch = 1
    utterance.volume = 1

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice =
      voices.find((voice) => voice.lang.toLowerCase().startsWith('id')) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ??
      voices[0]

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  const playBellChime = useCallback(() => {
    const ctx = getAudioContext()
    const master = ctx.createGain()
    master.gain.value = 0.14
    master.connect(ctx.destination)

    const now = ctx.currentTime
    const partials = [
      { freq: 1040, gain: 0.85 },
      { freq: 1560, gain: 0.55 },
      { freq: 2080, gain: 0.32 },
    ]

    partials.forEach(({ freq, gain }) => {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      osc.type = 'sine'
      osc.frequency.value = freq
      filter.type = 'lowpass'
      filter.frequency.value = 4200

      oscGain.gain.setValueAtTime(0.0001, now)
      oscGain.gain.exponentialRampToValueAtTime(gain, now + 0.02)
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4)

      osc.connect(filter)
      filter.connect(oscGain)
      oscGain.connect(master)
      osc.start(now)
      osc.stop(now + 1.5)
    })
  }, [])

  const announceQueueCall = useCallback((ticket: Pick<QueueTicket, 'queueNumber' | 'counterNumber'>) => {
    if (typeof window === 'undefined') return

    const counter = ticket.counterNumber ?? 1
    clearAnnouncementQueue()

    const sequence: AnnouncementStep[] = [
      { kind: 'bell', delay: 0 },
      { kind: 'speak', text: 'Nomor antrian', delay: 650 },
      { kind: 'speak', text: ticket.queueNumber, delay: 500 },
      { kind: 'speak', text: 'dipanggil ke loket', delay: 500 },
      { kind: 'speak', text: String(counter), delay: 450 },
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
    const source = ctx.createBufferSource()
    const gainNode = ctx.createGain()

    fetch(SOUND_URL)
      .then((res) => res.arrayBuffer())
      .then((buffer) => ctx.decodeAudioData(buffer))
      .then((audioBuffer) => {
        source.buffer = audioBuffer
        source.connect(gainNode)
        gainNode.connect(ctx.destination)
        gainNode.gain.value = 0.7
        source.start(0)
        source.onended = () => {
          playingRef.current = false
        }
      })
      .catch(() => {
        playingRef.current = false
      })
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

  return { playCallSound, playBeep, announceQueueCall, clearAnnouncementQueue }
}
