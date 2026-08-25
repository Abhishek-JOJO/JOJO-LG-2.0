"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/logger/logger";
import { JOJOButton, JOJOCustomButton } from "../ui/JOJOButton";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("[ErrorBoundary] Component error caught", { error, errorInfo: info });
  }

  resetError = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-10 text-center text-theme_1">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-(length:--text-sm) text-theme_5">{this.state.error?.message}</p>
          <JOJOCustomButton size={JOJOButton.Size.M} state={JOJOButton.State.DEFAULT} onClick={this.resetError}>
            Retry
          </JOJOCustomButton>
        </div>
      );
    }

    return this.props.children;
  }
}
