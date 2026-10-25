import type { ReactNode } from 'react'
import { PoweredBy } from '../../components/PoweredBy'
import { ThemeToggle } from '../theme/ThemeToggle'
import type { Theme } from '../theme/useTheme'
import './LoginPage.css'

interface PantallaAccesoProps {
  theme: Theme
  onToggleTheme: () => void
  /** Texto bajo la marca. */
  subtitulo: string
  children: ReactNode
}

/** Pantalla centrada con la marca, para entrar, registrarse o esperar la aprobación de la cuenta. */
export function PantallaAcceso({ theme, onToggleTheme, subtitulo, children }: PantallaAccesoProps) {
  return (
    <div className="login">
      <div className="login-theme">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <main className="login-card">
        <header className="login-header">
          <h1 className="login-brand">KIRA</h1>
          <PoweredBy tamano="mediano" />
          <p className="login-subtitle">{subtitulo}</p>
        </header>
        {children}
      </main>
    </div>
  )
}
