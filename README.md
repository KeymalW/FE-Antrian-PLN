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

## Prasyarat

- Node.js ≥ 20
- npm ≥ 10
- Backend Laravel berjalan (repo terpisah)
- MySQL untuk database backend

## Setup Lengkap

Sistem ini butuh 3 proses berjalan bersamaan:

1. **Backend API** (Laravel) — serve via Laragon / `php artisan serve`
2. **WebSocket Server** — `cd websocket-server && node server.js`
3. **Frontend** — `npm run dev` (http://localhost:5173)

> Pastikan `VITE_USE_MOCK_DATA=false` di `.env` supaya pake backend real.

## WebSocket Server

Server WebSocket ada di repo backend (`websocket-server/`), berjalan di:

- **WebSocket**: port `3001` — koneksi real-time dari frontend
- **HTTP relay**: port `3002` — penerima broadcast dari Laravel

Jalankan dari folder backend:

```bash
cd websocket-server
npm install   # sekali saja
node server.js
```

Event yang dikirim ke client: `queue_update`, `queue_call`, `queue_complete`, `queue_skip`, `stats_update`.

## Scripts

| Script            | Perintah            | Deskripsi                          |
| ----------------- | ------------------- | ---------------------------------- |
| `dev`             | `npm run dev`       | Jalankan dev server (Vite)         |
| `build`           | `npm run build`     | Build produksi ke `dist/`          |
| `preview`         | `npm run preview`   | Preview hasil build                |
| `lint`            | `npm run lint`      | Cek kode dengan ESLint             |
| `test`            | `npm run test`      | Jalankan test sekali (Vitest)      |
| `test:watch`      | `npm run test:watch`| Jalankan test secara watch mode    |

## Mock Mode

Frontend punya mock backend untuk development tanpa server Laravel.

Aktifkan dengan `VITE_USE_MOCK_DATA=true` di `.env` — semua service (auth, queue, settings) otomatis memakai data in-memory yang dipersist ke `sessionStorage`.

## Environment

| Variable             | Default                                  | Description                 |
| -------------------- | ---------------------------------------- | --------------------------- |
| `VITE_API_URL`       | `http://localhost/antrian-pln/public/api` | Base URL backend API       |
| `VITE_WS_URL`        | `ws://localhost:3001`                    | WebSocket URL real-time     |
| `VITE_PUBLIC_URL`    | `http://localhost:5173`                  | URL untuk QR code           |
| `VITE_USE_MOCK_DATA` | `true`                                   | Pakai mock backend          |

## Mock Credentials

| Username   | Password     | Role    | Counter |
| ---------- | ------------ | ------- | ------- |
| `admin`    | `admin123`   | admin   | -       |
| `petugas1` | `petugas123` | petugas | Loket 1 |
| `petugas2` | `petugas123` | petugas | Loket 2 |
| `petugas3` | `petugas123` | petugas | Loket 3 |

## Routes

| Path              | Halaman                          |
| ----------------- | -------------------------------- |
| `/`               | Landing page (navigasi 3 card)   |
| `/kiosk`          | Kiosk (ambil tiket)              |
| `/login`          | Login form                       |
| `/track/:id`      | Track tiket                      |
| `/monitor`        | Monitor TV                       |
| `/petugas`        | Dashboard petugas                |
| `/admin`          | Dashboard admin                  |
| `/admin/settings` | Pengaturan admin                 |
| `*`               | 404 Not Found                    |

## Deployment

```bash
npm run build
```

Hasil build ada di folder `dist/` — file statis murni yang bisa di-serve oleh server apa pun (Nginx, Apache, CDN, atau `npm run preview`).

Backend API dan WebSocket server tetap di-deploy terpisah, lalu arahkan `VITE_API_URL` dan `VITE_WS_URL` ke URL server masing-masing.

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
