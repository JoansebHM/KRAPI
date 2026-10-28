import { useCallback, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { BotonMenu, MenuFijo, MenuNavegacion } from '../components/MenuNavegacion'
import { Notificaciones } from '../components/Notificaciones'
import { PoweredBy } from '../components/PoweredBy'
import { variablesFaltantes } from '../config/env'
import { CuentaNoActiva } from '../features/auth/CuentaNoActiva'
import { BotonFiltros } from '../features/filtros/BotonFiltros'
import { FiltrosProvider } from '../features/filtros/FiltrosProvider'
import { InactivityDialog } from '../features/auth/InactivityDialog'
import { LoginPage } from '../features/auth/LoginPage'
import { RegistroPage } from '../features/auth/RegistroPage'
import { UserMenu } from '../features/auth/UserMenu'
import { useAuth } from '../features/auth/useAuth'
import { CategoriasPage } from '../features/categorias/CategoriasPage'
import { CrearElemento } from '../features/elementos/CrearElemento'
import { BotonNuevoLugar } from '../features/lugares/BotonNuevoLugar'
import { CrearPunto } from '../features/lugares/CrearPunto'
import { EstudioPagina } from '../features/estudios/EstudioPagina'
import { FichaLugar } from '../features/lugares/FichaLugar'
import { MoverPunto } from '../features/lugares/MoverPunto'
import { MisAsignacionesPage } from '../features/salidas/MisAsignacionesPage'
import { NuevaAsignacion } from '../features/salidas/NuevaAsignacion'
import { SalidaPagina } from '../features/salidas/SalidaPagina'
import { SalidasPage } from '../features/salidas/SalidasPage'
import { VerAsignacion } from '../features/salidas/VerAsignacion'
import { TiposZonaPage } from '../features/tiposZona/TiposZonaPage'
import { CrearZona } from '../features/zonas/CrearZona'
import { RedibujarZona } from '../features/zonas/RedibujarZona'
import { MapaProvider } from '../features/map/MapaProvider'
import { MapView } from '../features/map/MapView'
import { PerfilPage } from '../features/perfil/PerfilPage'
import { ThemeToggle } from '../features/theme/ThemeToggle'
import { UsuariosPage } from '../features/usuarios/UsuariosPage'
import { useTheme, type Theme } from '../features/theme/useTheme'
import { useEsEscritorio } from '../lib/useEsEscritorio'
import { CerrarPanelAlTocarElMapa } from './CerrarPanelAlTocarElMapa'
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
  const { session, perfil, errorPerfil } = useAuth()

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

  // Revisando el estado de la cuenta.
  if (!perfil && !errorPerfil) return <div className="app-loading" aria-busy="true" />

  // Pendiente, rechazada, desactivada o sin poder revisarla: no se muestra el mapa.
  if (perfil?.estado !== 'activo') return <CuentaNoActiva theme={theme} onToggleTheme={onToggleTheme} />

  return <AppConSesion theme={theme} onToggleTheme={onToggleTheme} />
}

function AppConSesion({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { esAdmin } = useAuth()
  const esEscritorio = useEsEscritorio()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const cerrarMenu = useCallback(() => setMenuAbierto(false), [])
  const [menuFijoVisible, setMenuFijoVisible] = useState(leerMenuFijoVisible)

  function alternarMenuFijo() {
    setMenuFijoVisible(!menuFijoVisible)
    guardarMenuFijoVisible(!menuFijoVisible)
  }

  return (
    <div className="app">
      <header className="app-header">
        {esEscritorio ? (
          <BotonMenu onTocar={alternarMenuFijo} menuFijoVisible={menuFijoVisible} />
        ) : (
          <BotonMenu onTocar={() => setMenuAbierto(true)} />
        )}
        <span className="app-marca">
          <span className="app-brand">KIRA</span>
          <PoweredBy />
        </span>
        <div className="app-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <UserMenu />
        </div>
      </header>
      <div className="app-cuerpo">
        {esEscritorio && menuFijoVisible && <MenuFijo />}
        <main className="app-main">
          <MapaProvider>
            <FiltrosProvider>
              {/* El mapa siempre está montado; las secciones se abren encima. */}
              <MapView theme={theme} />
              <Routes>
                <Route
                  path="/"
                  element={
                    <>
                      <BotonNuevoLugar />
                      <BotonFiltros />
                    </>
                  }
                />
                <Route path="/categorias" element={<CategoriasPage />} />
                <Route path="/perfil" element={<PerfilPage />} />
                {/* Un miembro que entra por la URL vuelve al mapa. */}
                <Route path="/usuarios" element={esAdmin ? <UsuariosPage /> : <Navigate to="/" replace />} />
                <Route path="/lugares/nuevo" element={<CrearPunto />} />
                <Route path="/lugares/:id" element={<FichaLugar />} />
                <Route path="/lugares/:id/mover" element={<MoverPunto />} />
                <Route path="/lugares/:id/redibujar" element={<RedibujarZona />} />
                <Route path="/zonas/nueva" element={<CrearZona />} />
                <Route path="/elementos/nuevo" element={<CrearElemento />} />
                <Route path="/tipos-de-zona" element={<TiposZonaPage />} />
                <Route path="/salidas" element={<SalidasPage />} />
                <Route path="/salidas/:id" element={<SalidaPagina />} />
                <Route path="/salidas/:id/zonas/nueva" element={esAdmin ? <NuevaAsignacion /> : <Navigate to="/salidas" replace />} />
                <Route path="/salidas/:salidaId/zonas/:asignacionId" element={<VerAsignacion />} />
                <Route path="/mis-asignaciones" element={<MisAsignacionesPage />} />
                <Route path="/lugares/:id/estudios/:estudioId" element={<EstudioPagina />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              {esEscritorio && <CerrarPanelAlTocarElMapa />}
            </FiltrosProvider>
          </MapaProvider>
        </main>
      </div>
      {!esEscritorio && <MenuNavegacion abierto={menuAbierto} onCerrar={cerrarMenu} />}
      <InactivityDialog />
    </div>
  )
}

/** En computador el menú fijo se ve por defecto; si se oculta, se recuerda en este dispositivo. */
const CLAVE_MENU_FIJO = 'krapi-menu-lateral'

function leerMenuFijoVisible() {
  try {
    return localStorage.getItem(CLAVE_MENU_FIJO) !== 'oculto'
  } catch {
    return true
  }
}

function guardarMenuFijoVisible(visible: boolean) {
  try {
    if (visible) localStorage.removeItem(CLAVE_MENU_FIJO)
    else localStorage.setItem(CLAVE_MENU_FIJO, 'oculto')
  } catch {
    // Sin almacenamiento (por ejemplo, navegación privada): vuelve a verse al recargar.
  }
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
