import { Component } from 'react';
import { Sentry } from '../utils/sentry';

// Before this existed, an uncaught error anywhere in the render tree —
// a malformed API response, a null reference in a component that assumed
// data would always be shaped a certain way — would white-screen the
// entire app with no fallback and no report of what happened. This is the
// safety net for that: React error boundaries only catch errors during
// rendering (not in event handlers or async code, which is why API calls
// still use their own try/catch + toast pattern throughout this app), but
// a render crash is exactly the class of error most likely to fully break
// the page for a real visitor.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught render error:', error, info);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="wrap">
          <div className="eyebrow">something broke</div>
          <h1>This page hit an unexpected error</h1>
          <p className="sub">
            That's on us, not something you did. It's been reported — try heading back to the
            start.
          </p>
          <button className="btn btn-primary" onClick={this.handleReset}>
            back to home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
