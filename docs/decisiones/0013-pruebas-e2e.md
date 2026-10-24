# 0013 · Pruebas de punta a punta con Supabase simulado

**Estado:** aceptada · 2026-10

## Contexto

Las revisiones visuales se hacían a mano en cada cambio y no había forma de repetirlas.

## Decisión

**Playwright** en tamaño de celular (390×800) contra un **Supabase simulado** en memoria (`e2e/soporte/`), sin tocar el proyecto real. Toda funcionalidad nueva trae sus pruebas.

## Descartado

Pruebas contra un Supabase local (requiere Docker); pruebas solo unitarias.

## Consecuencias

Hay que mantener el simulador al día con el esquema.
