import { MapView } from '../features/map/MapView'
import { ThemeToggle } from '../features/theme/ThemeToggle'
import { useTheme } from '../features/theme/useTheme'
import './App.css'

export function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-brand">KRAPI</span>
        <span className="app-area">Barrio Manila</span>
        <div className="app-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      <main className="app-main">
        <MapView />
      </main>
    </div>
  )
}
