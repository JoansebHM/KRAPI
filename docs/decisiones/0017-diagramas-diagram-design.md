# 0017 · Diagramas en SVG con la skill diagram-design

**Estado:** aceptada · 2026-10

## Contexto

Los diagramas de la documentación eran dibujos de texto dentro de bloques de código: difíciles de leer en celular y sin la identidad de Kratos.

## Decisión

Dibujar los diagramas con la skill **diagram-design** (plugin de Claude Code), con un perfil `kratos` que toma los tokens de `src/styles/theme.css` y usa fuentes del sistema para funcionar sin internet. El archivo `.diagram-design` del repositorio (`profile: kratos`) hace que la skill use ese perfil en este proyecto. Cada diagrama es un `.svg` en `docs/diagramas/`: GitHub lo muestra como imagen y `/docs` lo incrusta. Trae sus colores en claro y oscuro y sigue el tema elegido en `/docs`.

Se reemplazaron el modelo de datos (ER), el árbol de componentes de la app y el flujo de trabajo en GitHub. Las estructuras de carpetas siguen como texto, porque son listas.

## Descartado

Mermaid (dibuja el diagrama con su propio estilo, que no es el de Kratos, y necesita JavaScript); seguir con dibujos de texto.

## Consecuencias

Para cambiar un diagrama se edita su `.svg`, o se pide de nuevo a la skill con el mismo perfil. Antes de subirlo, conviene correr los chequeos de la skill (`self_check.py`) y revisarlo en claro y oscuro. Si el modelo de datos o la estructura de la app cambian, el diagrama se actualiza en el mismo PR.
