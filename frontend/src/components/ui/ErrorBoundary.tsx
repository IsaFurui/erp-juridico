import { Component, type ErrorInfo, type ReactNode } from 'react'
import Button from './Button'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro não capturado:', error, info)
  }

  private handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1 className="error-boundary__title">Ops, algo deu errado.</h1>
          <p className="error-boundary__text">
            Ocorreu um erro inesperado ao renderizar esta tela.
          </p>
          <Button onClick={this.handleReload}>Recarregar página</Button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary