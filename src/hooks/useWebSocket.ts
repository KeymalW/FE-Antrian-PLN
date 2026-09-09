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
  onServicesUpdate?: MessageHandler
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
        // Register tenant for server-side isolation
        try {
          const raw = localStorage.getItem('user')
          if (raw) {
            const u = JSON.parse(raw) as { tenantId?: number; tenant_id?: number }
            const tid = u.tenantId ?? u.tenant_id ?? null
            if (tid != null) {
              socket.send(JSON.stringify({ type: 'register', tenantId: tid }))
            }
          }
        } catch {
          /* ignore */
        }
      }

      socket.onmessage = (event) => {
        try {
          const msg: WebSocketMessage & { tenantId?: number } = JSON.parse(event.data)
          // Client-side tenant filter as fallback (server already filters, but keep for safety)
          try {
            const raw = localStorage.getItem('user')
            if (raw && msg.tenantId != null) {
              const u = JSON.parse(raw) as { tenantId?: number; tenant_id?: number }
              const myTid = u.tenantId ?? u.tenant_id ?? null
              if (myTid != null && msg.tenantId !== myTid) return
            }
            // Also check payload tenantId
            const pTid = (msg.payload as Record<string, unknown> | undefined)?.tenantId ??
                         (msg.payload as Record<string, unknown> | undefined)?.tenant_id
            if (pTid != null) {
              const raw2 = localStorage.getItem('user')
              if (raw2) {
                const u2 = JSON.parse(raw2) as { tenantId?: number; tenant_id?: number }
                const myTid2 = u2.tenantId ?? u2.tenant_id ?? null
                if (myTid2 != null && Number(pTid) !== Number(myTid2)) return
              }
            }
          } catch {
            /* ignore */
          }
          const h = handlersRef.current

          switch (msg.type) {
            case 'queue_update': h?.onQueueUpdate?.(msg); break
            case 'queue_call': h?.onQueueCall?.(msg); break
            case 'queue_complete': h?.onQueueComplete?.(msg); break
            case 'queue_skip': h?.onQueueSkip?.(msg); break
            case 'queue_recall': h?.onQueueRecall?.(msg); break
            case 'services_update': h?.onServicesUpdate?.(msg); break
            case 'stats_update': h?.onStatsUpdate?.(msg); break
            case 'registered':
            case 'pong':
              break
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
