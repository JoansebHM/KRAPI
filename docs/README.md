# Documentación de KIRA

Esta carpeta es la **fuente de verdad** del proyecto. Si algo no está aquí ni en el código, no está decidido.

| Documento | Contenido |
| --- | --- |
| [`producto.md`](producto.md) | Para qué existe la app, quién la usa, conceptos, reglas de negocio, uso en campo y estado |
| [`modelo-de-datos.md`](modelo-de-datos.md) | Tablas, relaciones, reglas, funciones, archivos y seguridad en Supabase |
| [`arquitectura.md`](arquitectura.md) | Stack, estructura de carpetas, patrones de código, variables de entorno y pruebas |
| [`diseno.md`](diseno.md) | Colores, tipografía, modo oscuro, reglas de UX móvil y componentes |
| [`decisiones/`](decisiones/) | Por qué se decidió cada cosa y qué se descartó |

Otros puntos de entrada:
- [`../CLAUDE.md`](../CLAUDE.md): resumen para asistentes de código, con comandos, reglas y trampas conocidas.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md): flujo de issues, ramas, commits y PRs.
- Issues de GitHub (milestone **MVP**): lo que falta por hacer.

**Regla:** si un cambio modifica algo de lo que dice esta carpeta, el mismo PR actualiza el documento.

**Versión navegable:** con la app corriendo, todo esto se lee en `/docs`, con menú, índice de cada página y buscador. Se genera sola a partir de estos archivos `.md` (ver [decisión 0016](decisiones/0016-documentacion-navegable.md)), así que basta con editar el Markdown.
