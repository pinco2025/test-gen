import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#121121] flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-white dark:bg-[#1e1e2d] rounded-2xl shadow-xl p-8 text-center">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-6 inline-block mb-6">
              <span className="material-symbols-outlined text-5xl text-red-600 dark:text-red-400">
                error
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Something went wrong
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The application encountered an unexpected error. You can try reloading the page or resetting the current view.
            </p>

            {this.state.error && (
              <div className="bg-gray-100 dark:bg-[#252535] rounded-lg p-4 mb-6 text-left overflow-auto max-h-40">
                <p className="text-sm font-mono text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-gray-200 dark:bg-[#252535] text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-[#2d2d3b] transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">restart_alt</span>
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
