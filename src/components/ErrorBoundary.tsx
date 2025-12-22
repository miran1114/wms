import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error; info?: React.ErrorInfo };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.setState({ info });
    // 可以在此上报错误到后端
    console.error('Frontend ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>页面发生错误</h2>
          <p>{this.state.error?.message}</p>
          {this.state.info?.componentStack && (
            <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', padding: 12 }}>
              {this.state.info.componentStack}
            </pre>
          )}
          <button onClick={() => window.location.reload()}>刷新页面</button>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

