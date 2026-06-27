import { Link } from 'react-router-dom'
import { FileQuestionIcon, ArrowLeftIcon } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <FileQuestionIcon className="mb-4 size-16 text-pln-cyan/50" />
      <h1 className="mb-2 text-4xl font-bold">404</h1>
      <p className="mb-2 text-lg font-medium">Halaman Tidak Ditemukan</p>
      <p className="mb-8 max-w-md text-sm text-muted-foreground">
        Halaman yang kamu cari tidak ada atau telah dipindahkan.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-lg bg-pln-cyan px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pln-cyan/90"
      >
        <ArrowLeftIcon className="size-4" />
        Kembali ke Beranda
      </Link>
    </div>
  )
}
