# 0006 · Supabase con la CLI como infraestructura como código

**Estado:** aceptada · 2026-10

## Contexto

Se necesitaba base de datos geográfica, autenticación y archivos en un plan gratuito, y que todo se pudiera reproducir.

## Decisión

**Supabase** (PostgreSQL + PostGIS, Auth, Storage). El esquema y la configuración viven en `supabase/` y se aplican con la CLI (`db:push`, `db:config`). Nada se cambia a mano en el panel.

## Descartado

Firebase (sin consultas geográficas); servidor propio.

## Consecuencias

Plan gratuito: 500 MB de base de datos, 1 GB de archivos y 50 MB por archivo. El proyecto se pausa tras una semana sin uso.
