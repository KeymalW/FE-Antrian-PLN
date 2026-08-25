import { useEffect, useRef } from 'react'
import { USE_MOCK_DATA } from '../mocks/mockMode'
import type { WebSocketMessage } from '../types/api'

type MessageHandler = (msg: WebSocketMessage) => void

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001/ws'

const HEARTBEAT_INTERVAL = 30000
const MAX_RETRIES = 5

export function useWebSocket(handlers?: {
  onQueueUpdate?: MessageHandler
  onQueueCall?: MessageHandler
  onQueueComplete?: MessageHandler
  onQueueSkip?: MessageHandler
  onQueueRecall?: MessageHandler
  onStatsUpdate?: MessageHandler
}) {
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(handlers)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const retryCountRef = useRef(0)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (USE_MOCK_DATA) {
      return
    }

    let cancelled = false

    function startHeartbeat(socket: WebSocket) {
      stopHeartbeat()
      heartbeatRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }))
        }
      }, HEARTBEAT_INTERVAL)
    }

    function stopHeartbeat() {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = undefined
      }
    }

    function connect() {
      if (cancelled) return

      if (retryCountRef.current >= MAX_RETRIES) {
        return
      }

      const token = localStorage.getItem('token')
      const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL
      const socket = new WebSocket(url)

      socket.onopen = () => {
        if (cancelled) {
          socket.close()
          return
        }
        retryCountRef.current = 0
        startHeartbeat(socket)
      }

      socket.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data)
          const h = handlersRef.current

          switch (msg.type) {
            case 'queue_update': h?.onQueueUpdate?.(msg); break
            case 'queue_call': h?.onQueueCall?.(msg); break
            case 'queue_complete': h?.onQueueComplete?.(msg); break
            case 'queue_skip': h?.onQueueSkip?.(msg); break
            case 'queue_recall': h?.onQueueRecall?.(msg); break
            case 'stats_update': h?.onStatsUpdate?.(msg); break
          }
        } catch {
          console.warn('Invalid WS message:', event.data)
        }
      }

      socket.onclose = () => {
        stopHeartbeat()
        wsRef.current = null
        retryCountRef.current++
        if (!cancelled && retryCountRef.current < MAX_RETRIES) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }
      }

      socket.onerror = () => {
        socket.close()
      }

      wsRef.current = socket
    }

    connect()

    return () => {
      cancelled = true
      stopHeartbeat()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])
}
