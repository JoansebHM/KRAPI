import { variablesFaltantes } from '../config/env'
import { InactivityDialog } from '../features/auth/InactivityDialog'
import { LoginPage } from '../features/auth/LoginPage'
import { UserMenu } from '../features/auth/UserMenu'
import { useAuth } from '../features/auth/useAuth'
import { MapView } from '../features/map/MapView'
import { ThemeToggle } from '../features/theme/ThemeToggle'
import { useTheme } from '../features/theme/useTheme'
import './App.css'

export function App() {
  const { theme, toggleTheme } = useTheme()
  const { session } = useAuth()

  if (variablesFaltantes.length > 0) return <ConfiguracionIncompleta variables={variablesFaltantes} />

  // Revisando si hay una sesión guardada: no se muestra nada para evitar un destello del login.
  if (session === undefined) return <div className="app-loading" aria-busy="true" />

  if (!session) return <LoginPage theme={theme} onToggleTheme={toggleTheme} />

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-brand">KRAPI</span>
        <span className="app-area">Barrio Manila</span>
        <div className="app-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <UserMenu />
        </div>
      </header>
      <main className="app-main">
        <MapView theme={theme} />
      </main>
      <InactivityDialog />
    </div>
  )
}

function ConfiguracionIncompleta({ variables }: { variables: string[] }) {
  return (
    <main className="app-config">
      <h1>Falta configurar la app</h1>
      <p>
        Agrega estas variables en el archivo <code>.env.local</code> y vuelve a iniciar <code>npm run dev</code>:
      </p>
      <ul>
        {variables.map((variable) => (
          <li key={variable}>
            <code>{variable}</code>
          </li>
        ))}
      </ul>
      <p>
        En <code>.env.example</code> está explicado de dónde sale cada una.
      </p>
    </main>
  )
}
