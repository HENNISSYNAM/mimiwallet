import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Last line of defence against a blank white screen.
 *
 * A render-time throw anywhere in the tree used to unmount everything and leave
 * an empty <div id="root">, which looks identical to "the site is broken" — the
 * worst possible outcome when someone opens the demo on their phone. This shows
 * a readable Vietnamese message plus a recovery button instead.
 */
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
  }

  private reload = () => {
    // A stale cached bundle is the most common cause, so clear site data we own
    // before reloading — otherwise the same broken build just loads again.
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* private mode / storage disabled */
    }
    window.location.replace('/');
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 text-primary">
            <RefreshCw size={24} />
          </div>
          <h1 className="text-lg font-display font-bold text-foreground">
            Ứng dụng cần tải lại
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Có thể trình duyệt đang giữ phiên bản cũ. Nhấn nút bên dưới để tải lại
            bản mới nhất.
          </p>
          <button
            onClick={this.reload}
            className="mt-6 w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold pressable"
          >
            Tải lại ứng dụng
          </button>
          <p className="text-[11px] text-muted-foreground/70 mt-4 font-mono break-words">
            {error.message}
          </p>
        </div>
      </div>
    );
  }
}
