import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const RoomPage = lazy(() => import('./pages/RoomPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const SponsorPage = lazy(() => import('./pages/SponsorPage'));
const TermsPage = lazy(() =>
  import('./pages/LegalPage').then((m) => ({ default: m.TermsPage })),
);
const PrivacyPage = lazy(() =>
  import('./pages/LegalPage').then((m) => ({ default: m.PrivacyPage })),
);

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface in dev; suppressed in prod by the browser console
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex-1 flex items-center justify-center p-6">
          <div
            role="alert"
            className="max-w-md w-full border-[3px] border-ink rounded-xl bg-accent-yellow p-6 text-center space-y-3 shadow-brutal-lg"
          >
            <h1 className="font-display text-2xl tracking-widest">SOMETHING WENT WRONG</h1>
            <p className="text-sm">
              The page hit an unexpected error. Try refreshing — if it keeps happening, let us know.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="font-display text-xs tracking-widest border-[3px] border-ink rounded-lg bg-paper px-4 py-2 hover:bg-ink hover:text-paper transition-colors"
            >
              REFRESH
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex-1 flex items-center justify-center p-6 font-display text-xs tracking-widest opacity-60"
    >
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/r/:roomId" element={<RoomPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/sponsor" element={<SponsorPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}
