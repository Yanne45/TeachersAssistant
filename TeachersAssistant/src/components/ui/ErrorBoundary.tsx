// ============================================================================
// ErrorBoundary — Attrape les erreurs runtime React par panneau
// ============================================================================

import React from 'react';
import { PanelError } from './PanelError';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erreur capturée:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <PanelError
          message={this.state.error?.message ?? 'Une erreur inattendue est survenue.'}
          onRetry={this.handleRetry}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}
