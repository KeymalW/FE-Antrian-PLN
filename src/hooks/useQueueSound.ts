import { useCallback, useRef } from 'react'

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

  return { playCallSound, playBeep }
}
