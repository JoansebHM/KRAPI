# 0020 · Nombre oficial KIRA

**Estado:** aceptada · 2026-10 · Refs #62

## Contexto

El nombre anterior de la aplicación ya no representa su identidad oficial. La marca debe ser consistente en la interfaz, la documentación y las comunicaciones del equipo.

## Decisión

El nombre oficial y visible de la aplicación es **KIRA**. Se usa en títulos, mensajes, documentación, metadatos y recursos navegables. La identidad visual sigue la decisión 0005 y conserva la firma "powered by KIT".

## Compatibilidad

No se renombran identificadores técnicos cuya modificación pueda romper instalaciones existentes: el repositorio GitHub y el proyecto Supabase conservan sus identificadores, las claves `krapi-*` de `localStorage` se mantienen para preservar sesiones y preferencias, y la variable `KRAPI_USUARIO_EMAIL` sigue aceptándose temporalmente como alias de `KIRA_USUARIO_EMAIL`. Tampoco se reescribe el comentario histórico de una migración ya aplicada.

## Consecuencias

Las nuevas superficies visibles usan KIRA. La variable de entorno recomendada es `KIRA_USUARIO_EMAIL`; las instalaciones existentes pueden migrar cuando les convenga. El paquete privado y el plugin de documentación usan ahora el identificador `kira`.
