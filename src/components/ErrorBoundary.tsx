'use client';

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Error boundary vyžaduje class komponentu — React nepodporuje
// error boundaries přes hooks.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ py: 4 }}>
          <Alert severity="error">
            <AlertTitle>Něco se pokazilo</AlertTitle>
            {this.state.error.message || 'Nastala neočekávaná chyba.'}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={() => this.setState({ error: null })}
              >
                Zkusit znovu
              </Button>
            </Box>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
