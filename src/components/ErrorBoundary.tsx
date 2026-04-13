import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  isChunkError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, isChunkError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    const msg = error.message || ''
    const isChunkError =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Loading CSS chunk') ||
      msg.includes('Importing a module script failed')

    return { hasError: true, error, isChunkError }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    if (this.state.isChunkError) {
      // Chunk error = stale deployment. Full reload fetches new index.html + chunks.
      window.location.reload()
    } else {
      this.setState({ hasError: false, error: null, isChunkError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-2">
              {this.state.isChunkError ? '새 버전이 배포되었습니다' : '페이지 로드 중 오류가 발생했습니다'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {this.state.isChunkError
                ? '새로고침하면 최신 버전으로 자동 업데이트됩니다.'
                : '일시적인 오류입니다. 다시 시도해 주세요.'}
            </p>
            {!this.state.isChunkError && this.state.error && (
              <pre className="mb-4 rounded-xl bg-gray-50 border border-gray-100 p-3 text-left text-xs text-gray-500 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-all shadow-sm"
            >
              <RefreshCw size={15} />
              {this.state.isChunkError ? '새로고침' : '다시 시도'}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
