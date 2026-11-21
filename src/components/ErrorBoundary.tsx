import { Component, type ReactNode } from "react";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("Praxis UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="site-container max-w-2xl py-20">
        <p className="eyebrow text-brick">Something broke</p>
        <h1 className="section-title mt-4 text-ink">
          This view could not render.
        </h1>
        <p className="mt-4 leading-relaxed text-mutedink">
          Your learner data is still saved in this browser. Reload to return to
          the app, or open the dashboard directly.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Reload the app
          </button>
          <a href="/dashboard" className="btn btn-secondary">
            Go to dashboard
          </a>
        </div>
        <p className="mono-meta mt-6 break-words">
          {this.state.error.message}
        </p>
      </div>
    );
  }
}
