import { useCallback, useRef } from 'react'
import type { QueueTicket } from '../types/queue'

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

    // second pulse
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

  return { playCallSound, playBeep, announceQueueCall, clearAnnouncementQueue }
}
