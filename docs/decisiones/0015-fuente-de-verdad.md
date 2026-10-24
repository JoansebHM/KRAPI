# 0015 · El repositorio como única fuente de verdad

**Estado:** aceptada · 2026-10

## Contexto

El contexto del proyecto vivía en conversaciones, y había que repetirlo al cambiar de herramienta o de persona.

## Decisión

`CLAUDE.md` es el punto de entrada y `docs/` contiene producto, modelo de datos, arquitectura, diseño y decisiones. **Cada PR que cambia una decisión actualiza su documento.**

## Descartado

Wiki de GitHub (queda fuera del control de versiones del código).

## Consecuencias

Cualquier asistente o persona nueva puede empezar leyendo `CLAUDE.md`.
