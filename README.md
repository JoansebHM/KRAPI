# KRAPI · Geovisor Kratos

Geovisor del barrio Manila (El Poblado, Medellín) para registrar ubicaciones, estudios y evidencias de campo.

## Stack

- React + TypeScript + Vite
- MapLibre GL (mapa)
- Supabase (base de datos, autenticación y archivos) — próximamente

## Correr en local

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local   # opcional: configura el estilo del mapa
npm run dev
```

Abre http://localhost:5173. Para probar desde el celular en la misma red Wi‑Fi:

```bash
npm run dev -- --host
```

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve la versión de producción localmente |
| `npm run lint` | Revisa el código con oxlint |

## Estructura

```
src/
  app/          # Shell de la aplicación (layout, rutas)
  config/       # Variables de entorno y configuración
  features/     # Una carpeta por funcionalidad
    map/        # Mapa base y límite del barrio
  styles/       # Tema (colores, tipografía, espaciado)
```

## Cómo contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de empezar: explica el flujo de issues, ramas, commits y pull requests.
