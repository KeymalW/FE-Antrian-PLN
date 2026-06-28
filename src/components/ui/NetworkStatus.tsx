import { useEffect, useState } from 'react'

export function NetworkStatus() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const onOffline = () => setOffline(true)
    const onOnline = () => setOffline(false)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 left-0 z-[9999] flex w-full items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-lg">
      <span className="size-2 rounded-full bg-current animate-pulse" />
      Tidak ada koneksi internet. Perubahan tidak akan tersimpan.
    </div>
  )
}
