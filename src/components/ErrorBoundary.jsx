import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error information
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    // Clear error state and reload
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleRetry = () => {
    // Just clear the error state to retry rendering
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div style={styles.container}>
          <div style={styles.errorCard}>
            <h1 style={styles.title}>😵 Что-то пошло не так</h1>
            <p style={styles.message}>
              Произошла непредвиденная ошибка в приложении. Попробуйте обновить страницу или повторить попытку.
            </p>
            
            <div style={styles.buttonGroup}>
              <button 
                onClick={this.handleRetry} 
                style={{...styles.button, ...styles.retryButton}}
              >
                🔄 Повторить
              </button>
              <button 
                onClick={this.handleReload} 
                style={{...styles.button, ...styles.reloadButton}}
              >
                🔁 Обновить страницу
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Детали ошибки (только в режиме разработки)</summary>
                <div style={styles.errorDetails}>
                  <h3>Error:</h3>
                  <pre style={styles.errorText}>
                    {this.state.error && this.state.error.toString()}
                  </pre>
                  
                  <h3>Component Stack:</h3>
                  <pre style={styles.errorText}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                  
                  <h3>Error Stack:</h3>
                  <pre style={styles.errorText}>
                    {this.state.error && this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    // Render children normally if no error
    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
    marginTop: '0'
  },
  message: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '30px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  button: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '140px'
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    '&:hover': {
      backgroundColor: '#45a049'
    }
  },
  reloadButton: {
    backgroundColor: '#2196F3',
    color: 'white',
    '&:hover': {
      backgroundColor: '#1976D2'
    }
  },
  details: {
    marginTop: '30px',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '16px'
  },
  summary: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    cursor: 'pointer',
    marginBottom: '12px'
  },
  errorDetails: {
    fontSize: '12px'
  },
  errorText: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '12px',
    fontSize: '11px',
    lineHeight: '1.4',
    overflow: 'auto',
    maxHeight: '200px',
    color: '#d32f2f'
  }
};

export default ErrorBoundary;