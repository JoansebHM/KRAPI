# 0023 · Los participantes de un estudio son cuentas

**Estado:** aceptada · 2026-10 · Refs #104 · Reemplaza, de la [0021](0021-usuarios-individuales.md), el punto "usuarios y responsables son cosas distintas"

## Contexto

Con las cuentas individuales, una persona existía dos veces: como **cuenta** (para entrar) y como **responsable** (el catálogo que se elegía en los estudios), unidas solo si elegía "Este soy yo". Lo siguiente es asignar zonas a personas concretas, que reporten su avance desde la app: eso exige que todo sea por cuenta.

## Decisión

- **Se elimina el catálogo de responsables.** Los estudios tienen **participantes**, que son cuentas (`estudio_participantes`). Solo se eligen cuentas activas; las desactivadas siguen apareciendo en los estudios viejos.
- **El avatar dibujado pasa a la cuenta** (`perfiles.avatar_semilla`). Se elige al registrarse (viene uno al azar) y se cambia en Mi perfil.
- Al crear un estudio vienen marcadas **la cuenta propia** y las del último estudio hecho desde ese celular.
- **Histórico:** los responsables vinculados a una cuenta pasaron a ser participantes de sus estudios, con su avatar. El nombre de los que no tenían cuenta quedó como texto en cada estudio (`estudios.participantes_anteriores`), y se muestra como "También participó: …".

## Descartado

- **Mantener los dos catálogos:** duplica a las personas y las asignaciones no sabrían a quién notificar.
- **Exigir que cada responsable se vinculara antes de migrar:** frena el cambio por personas que ya no están en el equipo.
- **Crear cuentas desactivadas para los responsables sin cuenta:** llena Usuarios de cuentas que nadie usa.

## Consecuencias

- Alguien de afuera que acompañe una salida no puede figurar como participante; se menciona en las notas del estudio.
- La bitácora conserva los registros de la tabla de responsables, aunque la tabla ya no exista.
