import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          padding: '2rem',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-1, #f5f5f5)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: '1.5rem', color: 'var(--err, #d32f2f)' }}>
          Something went wrong
        </h1>
        <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
          The application encountered an unexpected error.
        </p>
        <details style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '0.5rem', fontWeight: 600 }}>
            Error details
          </summary>
          <pre
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-0, #282c34)',
              color: 'var(--fg-0, #abb2bf)',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
        <button
          onClick={resetError}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--brand, #2196f3)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}