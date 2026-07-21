# FE Antrian PLN


Sistem antrian digital PLN — kiosk ambil tiket, tracking real-time, monitor TV, dashboard petugas & admin.

## Fitur

- **Kiosk** — ambil tiket QR, cetak otomatis, redirect ke halaman tracking
- **Track Ticket** — pantau status antrian via QR scan, link demo kalo tiket gak ditemukan
- **Monitor TV** — tampilan real-time per counter, status istirahat
- **Petugas Dashboard** — panggil/skip/complete tiket, grafik mingguan, toggle istirahat
- **Admin Dashboard** — overview multi-counter, full stats, riwayat global, export Excel

## Tech Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Recharts, shadcn/ui, qrcode.react, xlsx, react-router-dom v7

## Mulai

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
```

## Environment

| Variable | Default | Description |
|---|---|---|
| `VITE_PUBLIC_URL` | `http://localhost:5173` | URL untuk QR code |
| `VITE_USE_MOCK_DATA` | `true` (otomatis) | Pakai mock backend |

## Mock Credentials

| Username | Password | Role | Counter |
|---|---|---|---|
| `admin` | `admin123` | admin | - |
| `petugas1` | `petugas123` | petugas | Loket 1 |
| `petugas2` | `petugas123` | petugas | Loket 2 |
| `petugas3` | `petugas123` | petugas | Loket 3 |

## Routes

| Path | Halaman |
|---|---|
| `/` | Kiosk (ambil tiket) |
| `/track/:id` | Track tiket |
| `/monitor` | Monitor TV |
| `/petugas` | Dashboard petugas |
| `/admin` | Dashboard admin |

## Struktur

```
src/
├── components/ui/   # shadcn components
├── pages/           # route pages
├── store/           # zustand stores
├── services/        # API layer (mock/real)
├── mocks/           # mock backend data
├── lib/             # utilities
└── types/           # TypeScript types
```
