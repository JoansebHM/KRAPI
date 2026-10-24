# 0001 · Vite + React + TypeScript, sin servidor propio

**Estado:** aceptada · 2026-10

## Contexto

La app es privada (un usuario compartido), no necesita SEO ni renderizado en servidor, y toda la lógica de datos la resuelve Supabase.

## Decisión

Usar **Vite + React 19 + TypeScript estricto** como aplicación de una sola página. Rutas con React Router y datos con TanStack Query.

## Descartado

Next.js (agrega servidor y complejidad sin beneficio aquí).

## Consecuencias

Se despliega como archivos estáticos. Toda la seguridad depende de RLS en Supabase, nunca del frontend.
