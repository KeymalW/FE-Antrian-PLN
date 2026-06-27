import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
          <AlertTriangleIcon className="mb-4 size-12 text-destructive" />
          <h1 className="mb-2 text-xl font-bold">Terjadi Kesalahan</h1>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            Aplikasi mengalami kendala. Silakan muat ulang halaman atau hubungi administrator.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-pln-cyan px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pln-cyan/90"
          >
            <RefreshCwIcon className="size-4" />
            Muat Ulang Halaman
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
