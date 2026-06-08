import { useEffect, useRef } from 'react'
import { USE_MOCK_DATA } from '../mocks/mockMode'
import type { WebSocketMessage } from '../types/api'

type MessageHandler = (msg: WebSocketMessage) => void

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001/ws'

const HEARTBEAT_INTERVAL = 30000

export function useWebSocket(handlers?: {
  onQueueUpdate?: MessageHandler
  onQueueCall?: MessageHandler
  onQueueComplete?: MessageHandler
  onQueueSkip?: MessageHandler
  onStatsUpdate?: MessageHandler
}) {
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(handlers)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>()

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

      const socket = new WebSocket(WS_URL)

      socket.onopen = () => {
        if (cancelled) {
          socket.close()
          return
        }
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
            case 'stats_update': h?.onStatsUpdate?.(msg); break
          }
        } catch {
          console.warn('Invalid WS message:', event.data)
        }
      }

      socket.onclose = () => {
        stopHeartbeat()
        wsRef.current = null
        if (!cancelled) {
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
