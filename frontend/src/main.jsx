import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { apiUrl } from './utils/api'

// Global window error listener
window.addEventListener('error', (event) => {
  fetch(apiUrl('/api/debug/client-error'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: event.message,
      stack: event.error ? event.error.stack : `${event.filename}:${event.lineno}:${event.colno}`,
      componentStack: 'window.onerror'
    })
  }).catch(() => {});
});

window.addEventListener('unhandledrejection', (event) => {
  fetch(apiUrl('/api/debug/client-error'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack || 'Unhandled Promise Rejection',
      componentStack: 'unhandledrejection'
    })
  }).catch(() => {});
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    fetch(apiUrl('/api/debug/client-error'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error?.message,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack
      })
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "#ef4444", background: "#060d19", padding: "32px", fontFamily: "monospace", minHeight: "100vh" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#f87171", marginBottom: "12px" }}>
            ⚠️ Aiqon Frontend Runtime Error Caught
          </h2>
          <p style={{ color: "#ffffff", marginBottom: "16px" }}>{this.state.error?.toString()}</p>
          <pre style={{ background: "#0f172a", border: "1px solid #334155", padding: "16px", borderRadius: "8px", overflowX: "auto", fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>
            {this.state.error?.stack}
          </pre>
          <pre style={{ background: "#0f172a", border: "1px solid #334155", padding: "16px", borderRadius: "8px", overflowX: "auto", fontSize: "12px", color: "#64748b" }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)


