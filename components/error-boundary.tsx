"use client";
import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary caught", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fixed inset-0 bg-canvas flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-2xl border border-status-error/30 bg-panel p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-status-error/10 border border-status-error/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-status-error" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">
            Something broke
          </h2>
          <p className="text-sm text-text-secondary">
            {this.state.error.message || "Unexpected error. Try again."}
          </p>
          <pre className="text-2xs font-mono text-text-muted bg-canvas rounded p-2 overflow-auto max-h-32">
            {this.state.error.stack?.slice(0, 400)}
          </pre>
          <div className="flex gap-2 mt-2">
            <button
              onClick={this.reset}
              className="h-9 px-3 rounded-lg bg-accent-warm text-canvas text-xs font-medium hover:brightness-110 flex items-center gap-1.5"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Try again
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="h-9 px-3 rounded-lg bg-white/5 text-text-secondary text-xs hover:text-text-primary"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
