import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback, name } = this.props;

      if (fallback) return fallback(this.state.error, this.handleReset);

      return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-300 mb-1">
            {name ? `${name} failed to load` : 'Something went wrong'}
          </p>
          <p className="text-xs text-red-400/70 mb-3 font-mono max-w-md mx-auto truncate">
            {this.state.error?.message}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function SafeComponent({ children, name, fallback }) {
  return (
    <ErrorBoundary name={name} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
