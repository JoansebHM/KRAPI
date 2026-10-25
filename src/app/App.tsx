import { useCallback, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { BotonMenu, MenuNavegacion } from '../components/MenuNavegacion'
import { Notificaciones } from '../components/Notificaciones'
import { PoweredBy } from '../components/PoweredBy'
import { variablesFaltantes } from '../config/env'
import { InactivityDialog } from '../features/auth/InactivityDialog'
import { LoginPage } from '../features/auth/LoginPage'
import { RegistroPage } from '../features/auth/RegistroPage'
import { UserMenu } from '../features/auth/UserMenu'
import { useAuth } from '../features/auth/useAuth'
import { CategoriasPage } from '../features/categorias/CategoriasPage'
import { BotonNuevoLugar } from '../features/lugares/BotonNuevoLugar'
import { CrearPunto } from '../features/lugares/CrearPunto'
import { EstudioPagina } from '../features/estudios/EstudioPagina'
import { FichaLugar } from '../features/lugares/FichaLugar'
import { MapaProvider } from '../features/map/MapaProvider'
import { MapView } from '../features/map/MapView'
import { ResponsablesPage } from '../features/responsables/ResponsablesPage'
import { ThemeToggle } from '../features/theme/ThemeToggle'
import { useTheme, type Theme } from '../features/theme/useTheme'
import './App.css'

export function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      <Contenido theme={theme} onToggleTheme={toggleTheme} />
      <Notificaciones theme={theme} />
    </>
  )
}

function Contenido({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { session } = useAuth()

  if (variablesFaltantes.length > 0) return <ConfiguracionIncompleta variables={variablesFaltantes} />

  // Revisando si hay una sesión guardada: no se muestra nada para evitar un destello del login.
  if (session === undefined) return <div className="app-loading" aria-busy="true" />

  if (!session) {
    return (
      <Routes>
        <Route path="/registro" element={<RegistroPage theme={theme} onToggleTheme={onToggleTheme} />} />
        <Route path="*" element={<LoginPage theme={theme} onToggleTheme={onToggleTheme} />} />
      </Routes>
    )
  }

  return <AppConSesion theme={theme} onToggleTheme={onToggleTheme} />
}

function AppConSesion({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const cerrarMenu = useCallback(() => setMenuAbierto(false), [])

  return (
    <div className="app">
      <header className="app-header">
        <BotonMenu onAbrir={() => setMenuAbierto(true)} />
        <span className="app-marca">
          <span className="app-brand">KIRA</span>
          <PoweredBy />
        </span>
        <div className="app-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <UserMenu />
        </div>
      </header>
      <main className="app-main">
        <MapaProvider>
          {/* El mapa siempre está montado; las secciones se abren encima. */}
          <MapView theme={theme} />
          <Routes>
            <Route path="/" element={<BotonNuevoLugar />} />
            <Route path="/categorias" element={<CategoriasPage />} />
            <Route path="/responsables" element={<ResponsablesPage />} />
            <Route path="/lugares/nuevo" element={<CrearPunto />} />
            <Route path="/lugares/:id" element={<FichaLugar />} />
            <Route path="/lugares/:id/estudios/:estudioId" element={<EstudioPagina />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MapaProvider>
      </main>
      <MenuNavegacion abierto={menuAbierto} onCerrar={cerrarMenu} />
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
