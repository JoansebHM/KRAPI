import { defineConfig, devices } from '@playwright/test'

const PUERTO = 4173

/**
 * Pruebas de punta a punta. Corren contra el servidor de desarrollo en modo "e2e" (.env.e2e),
 * con Supabase y el mapa base simulados: no tocan datos reales ni necesitan internet.
 *
 *   npm run test:e2e        corre todas
 *   npm run test:e2e:ui     abre la interfaz de Playwright para verlas paso a paso
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    // Permite usar un Chromium ya instalado (por ejemplo en CI) en lugar del de Playwright.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [
    {
      // La app se usa sobre todo en campo, así que las pruebas corren en tamaño de celular.
      name: 'celular',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 800 }, hasTouch: true },
    },
  ],
  webServer: {
    command: `npx vite --mode e2e --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
