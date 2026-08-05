import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AppRouter from './app/router'
import ErrorBoundary from './components/ui/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App