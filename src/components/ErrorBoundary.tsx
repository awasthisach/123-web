import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error boundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
          <div className="max-w-md w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 text-center">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Something went wrong</h1>
            <p className="text-xs text-zinc-500 break-words">{this.state.message}</p>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
