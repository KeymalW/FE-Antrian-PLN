# AI Handoff — FE Antrian PLN

## Ringkasan

Sistem antrian digital PLN. 6 halaman, dual-mode (mock/real API), WebSocket real-time, sound notification (TTS + bell), grafik mingguan, QR code tracking, role-based access (admin/petugas/kiosk/tvdisplay).

## Mode Mock

Mock aktif secara default (`VITE_USE_MOCK_DATA !== 'false'` di `src/mocks/mockMode.ts`).
State mock di-persist ke `sessionStorage` dengan key `mockQueueState` biar gak ilang pas navigasi.

### Mock Credentials

| Username | Password | Role | Counter |
|---|---|---|---|
| `adminulpsubang` | `adminulpsubang` | admin | - |
| `petugasulpsubang` | `petugasulpsubang` | petugas | 1 |
| `kioskulpsubang` | `kioskulpsubang` | kiosk | - |
| `tvulpsubang` | `tvulpsubang` | tvdisplay | - |

Redirect login sesuai role via `src/lib/roles.ts` (`ROLE_HOME`): admin → `/admin`, petugas → `/petugas`, kiosk → `/kiosk`, tvdisplay → `/monitor`.

### Mock Data

- 8 tiket real-time (ticket-1 sampai ticket-8) dengan berbagai status
- 15 tiket weekly (week-1 sampai week-15) untuk data grafik mingguan
- `mockGetLastCalled(counterNumber)` ambil tiket `called`/`serving` terakhir per counter

## Routing (`src/App.tsx`)

```
<AppLayout>               ← punya Navbar
  /                       → Redirect sesuai role (atau /login kalo belum login)
  /kiosk                  → Ambil tiket (ProtectedRoute role=kiosk)
  /login                  → Login form
  /admin                  → AdminDashboard (ProtectedRoute role=admin)
  /petugas                → PetugasDashboard (ProtectedRoute role=petugas)
</AppLayout>
/monitor                  → MonitorTV (ProtectedRoute role=tvdisplay, fullscreen, tanpa navbar, ada tombol logout)
/track/:id                → TrackTicket (standalone, tanpa navbar)
```

## Pages

| File | Component | Fungsi |
|---|---|---|
| `Kiosk.tsx` | Kiosk | Ambil tiket (4 layanan), estimasi waktu tunggu, redirect ke `/track/:id` setelah sukses |
| `TrackTicket.tsx` | TrackTicket | Tracking via URL param, QR code, tombol cetak (hidden print template), polling tiap 5 detik (stop kalo status completed/skipped), link demo kalo tiket gak ditemukan |
| `MonitorTV.tsx` | MonitorTV | 3 counter card + waiting list auto-scroll, jam real-time, badge ISTIRAHAT kalo counter status paused |
| `PetugasDashboard.tsx` | PetugasDashboard | Panggil/skip/complete tiket, auto-call next setelah selesai, toggle istirahat, grafik mingguan, polling durasi per detik. WS `onQueueCall` filter by `counterNumber` biar gak desync. `fetchData` pake abort-on-stale (fetchIdRef) biar gak race condition. `handleComplete` single fetch aja. |
| `AdminDashboard.tsx` | AdminDashboard | Multi-counter status, statistik real-time, waiting list, riwayat selesai, grafik mingguan bar chart, export Excel, clear history. `fetchData` pake stale guard. Elapsed time real-time tiap detik. |
| `Login.tsx` | Login | Login form, redirect based on role |

## Stores (Zustand)

### `authStore.ts`
- `user: User | null`, `token: string | null`, `isAuthenticated: boolean`
- `login(user, token)`, `logout()` — persist ke localStorage

### `queueStore.ts`
- `queueList: QueueTicket[]`, `lastCalled: QueueTicket | null`, `stats: QueueStats | null`, `isLoading: boolean`
- `counterStatus: Record<number, boolean>` — key = nomor counter, value = `true` kalo istirahat
- Actions: `setQueueList`, `setLastCalled`, `setStats`, `setLoading`, `addTicket`, `updateTicket` (juga update `lastCalled` kalo ID cocok), `setCounterStatus`

## Services (`src/services/`)

Semua service dual-mode (mock/real) via `USE_MOCK_DATA` flag.

- `api.ts` — Axios instance, baseURL dari `VITE_API_URL`, interceptor token + auto-redirect 401 (pake `useAuthStore.getState().logout()` biar cleanup state)
- `auth.ts` — login/logout/getProfile
- `queue.ts` — getQueueList, takeTicket, callQueue, skipQueue, completeQueue, getQueueStats, getTicketById, getLastCalled, clearQueueHistory

## Key Behaviors & Edge Cases

1. **WebSocket fake di mock mode** — `useWebSocket` hook skip koneksi kalo `USE_MOCK_DATA = true`. Data cuma di-fetch via polling (interval + event-based dari petugas action). Di mode real, heartbeat `{ type: 'ping' }` tiap 30 detik jaga koneksi tetep hidup.
2. **Auto-call** — `handleComplete` di PetugasDashboard otomatis panggil tiket berikutnya dari antrian (`useQueueStore.getState().queueList[0]`) setelah selesai. Skip tetep manual. Cuma 1x fetchData di akhir (gak dobel).
3. **Counter pause blocks call** — Tombol Panggil di-disable kalo `isCounterPaused`, dengan notice kuning. Juga di-disable kalo `hasActiveTicket`.
4. **Print layout** — Hidden div di TrackTicket dengan class `hidden print:block`. QR code + info tiket cuma muncul pas `window.print()`.
5. **QR code** — Encode full URL ke `/track/:id`, bukan JSON. URL dari `window.location.origin` (fallback otomatis).
6. **Auto-redirect kiosk** — Setelah ambil tiket, redirect ke `/track/:id` (bukan inline success view).
7. **Monitor TV** — Background dark, grid 3 kolom counter (atau 1 kolom di mobile). Counter card jadi merah saat ISTIRAHAT.
8. **Demo ticket links** — Di TrackTicket, kalo tiket gak ditemukan, tampilin link demo untuk tiket sample (ticket-1 sampai ticket-8).

## Hooks

| File | Fungsi |
|---|---|
| `useWebSocket.ts` | Koneksi WebSocket ke `VITE_WS_URL`, auto-reconnect 3 detik, dispatch by message type, heartbeat `{ type: 'ping' }` tiap 30 detik. Skip kalo mock mode. |
| `useQueueSound.ts` | `playBeep()` (800Hz oscillator), `announceQueueCall()` (bell + TTS Indonesia), `unlockAudio()`, `clearAnnouncementQueue()`, `playBellChime()` (audio file) |

## Env Variables

| Variable | Default | Dipakai di |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001/api` | services/api.ts |
| `VITE_WS_URL` | `ws://localhost:3001/ws` | hooks/useWebSocket.ts |
| `VITE_USE_MOCK_DATA` | `'true'` (kalo bukan `'false'`) | mocks/mockMode.ts |
| `VITE_PUBLIC_URL` | `http://localhost:5173` | pages/TrackTicket.tsx |

## Recent Bug Fixes

### Session 1 (2026-06-08)

| # | Bug | Fix |
|---|-----|-----|
| 1 | **Desync**: WS `onQueueCall` set `lastCalled` tanpa filter counter | Nambah `if (payload.counterNumber === counterNumber)` di `PetugasDashboard.tsx:162` |
| 2 | **WebSocket gak ada heartbeat** | Nambah `startHeartbeat` kirim `{ type: 'ping' }` tiap 30 detik di `useWebSocket.ts:34-48` |
| 3 | **`updateTicket` gak update `lastCalled`** | `updateTicket` di `queueStore.ts:39-42` sekarang update `lastCalled` kalo ID cocok |
| 4 | **401 redirect pake hardcode localStorage** | Pake `useAuthStore.getState().logout()` di `api.ts:23` |
| 5 | **Double fetch di `handleComplete`** | Hapus fetch pertama, cukup 1 fetch di akhir (`PetugasDashboard.tsx:220-241`) |
| 6 | **Race condition fetchData** | Pake `fetchIdRef` counter + stale check (`PetugasDashboard.tsx:126,134,143`) |

### Session 2 (2026-06-08)

| # | Bug | Fix |
|---|-----|-----|
| 7 | **Race condition fetchData AdminDashboard** | Nambah `fetchIdRef` + stale check di `AdminDashboard.tsx:106,117` |
| 8 | **Race condition fetchAll MonitorTV** | Nambah `fetchIdRef` + stale check di `MonitorTV.tsx:31,42,48` |
| 9 | **Desync MonitorTV → PetugasDashboard** | Hapus `setLastCalled(payload)` dari `MonitorTV.tsx` — MonitorTV punya `lastCalledList` sendiri |
| 10 | **TrackTicket polling gak berhenti** | `fetchTicket` clear interval kalo status `completed`/`skipped` (`TrackTicket.tsx:52-54`) |
| 11 | **Kiosk useEffect tanpa cleanup** | Nambah `cancelled` flag di `Kiosk.tsx:40,46,49` |
| 12 | **AdminDashboard elapsed gak real-time** | Nambah `now` state + interval tiap detik, `formatElapsed` pake param `now` (`AdminDashboard.tsx:96-99,78`) |
| 14 | **Kiosk type assertion** | Ganti type ke `Record<string, ...>` biar gak bohong (`Kiosk.tsx:34`) |

## Known Issues / Next Steps


## Tech Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Recharts, shadcn/ui, qrcode.react, xlsx, react-router-dom v7, axios, sonner, lucide-react.
