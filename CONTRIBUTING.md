# Cómo trabajar en KIRA

Esta guía explica cómo se organiza el trabajo en el repositorio. La idea es que cualquier persona de Kratos pueda entender qué se hizo, cuándo y por qué, y que pueda aportar sin romper nada.

## Flujo de trabajo

Todo cambio sigue el mismo camino:

![Flujo de trabajo: issue, rama, commits, pull request, revisión y merge a main](docs/diagramas/flujo-de-trabajo.svg)

1. **Issue.** Todo empieza con una issue que describe qué hay que hacer y cuándo se considera terminado (criterios de aceptación). Si no existe, créala con una de las plantillas.
2. **Rama.** Crea una rama desde `main` con el número de la issue (ver [Ramas](#ramas)).
3. **Commits.** Haz commits pequeños, cada uno con un solo propósito (ver [Commits](#commits)).
4. **Pull request.** Abre un PR hacia `main` y llena la plantilla. Explica qué hace cada commit y cómo probar el cambio.
5. **Revisión.** Otra persona del equipo revisa el PR. Si hay comentarios, se corrigen con nuevos commits en la misma rama.
6. **Merge.** Se une con **"Create a merge commit"** para conservar todos los commits en el historial. Después se borra la rama.

`main` siempre debe funcionar. Nunca se hacen commits directamente en `main`.

## Ramas

Formato: `tipo/numero-de-issue-descripcion-corta`

| Tipo | Cuándo usarlo | Ejemplo |
| --- | --- | --- |
| `feat` | Funcionalidad nueva | `feat/14-crear-puntos` |
| `fix` | Corrección de un error | `fix/31-marcador-no-se-ve` |
| `docs` | Solo documentación | `docs/2-guia-de-contribucion` |
| `chore` | Configuración, dependencias, CI | `chore/5-ci-build-lint` |
| `refactor` | Reorganizar código sin cambiar lo que hace | `refactor/40-servicio-storage` |

Usa minúsculas, sin tildes ni espacios, con guiones.

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/), con la descripción en español:

```
tipo(área): descripción en imperativo y en minúscula

Cuerpo opcional: por qué se hizo el cambio y cualquier detalle
que no sea obvio leyendo el código.

Refs #14
```

- **Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- **Áreas comunes:** `mapa`, `ubicaciones`, `estudios`, `evidencias`, `filtros`, `catalogos`, `auth`, `db`, `tema`, `ui`.
- **Descripción:** en imperativo ("agregar", no "agregué" ni "agregando"), corta y sin punto final.
- **Referencia:** termina con `Refs #número` para enlazar el commit con su issue.

Ejemplos:

```
feat(mapa): limitar la navegación a 1 km alrededor de Manila
fix(evidencias): mostrar error cuando el archivo supera 50 MB
docs: explicar cómo configurar el proveedor del mapa
```

Un commit debe poder entenderse solo. Si en el mensaje necesitas escribir "y", probablemente son dos commits.

## Pull requests

- **Título:** igual que un commit, con el número de la issue. Ejemplo: `feat(mapa): limitar la navegación alrededor de Manila (#4)`.
- **Descripción:** usa la plantilla. Lo más importante es la sección de commits: una línea por commit explicando qué hace y por qué.
- **Cierre de issues:** escribe `Closes #número` para que la issue se cierre sola al hacer merge.
- **Tamaño:** un PR por issue. Si crece demasiado, divídelo.
- **Capturas:** si cambia algo visible, agrega capturas en celular y escritorio.

Antes de pedir revisión:

```bash
npm run lint
npm run build
npm run test:e2e
```

Los tres deben terminar sin errores. Si el cambio agrega o modifica una funcionalidad, agrega o actualiza sus pruebas en `e2e/`.

**La documentación va en el mismo PR.** Si el cambio hace que algo de `README.md`, este archivo, `CLAUDE.md` o `docs/` quede desactualizado (un comando, una tabla, un diagrama, el estado del proyecto…), corrígelo ahí mismo. La documentación navegable (`/docs`) se genera desde esos `.md`, así que no hay que editar nada más; revisa cómo quedó con `npm run dev` en http://localhost:5173/docs.

## Labels

Cada issue lleva al menos un label de **tipo**, uno de **área** y uno de **prioridad**.

| Grupo | Labels | Para qué sirve |
| --- | --- | --- |
| Tipo | `funcionalidad`, `mejora`, `error`, `documentación`, `mantenimiento`, `investigación` | Qué clase de trabajo es |
| Área | `mapa`, `ubicaciones`, `estudios`, `evidencias`, `filtros`, `catálogos`, `autenticación`, `base de datos`, `interfaz`, `infraestructura` | Qué parte de la app toca |
| Prioridad | `alta`, `media`, `baja` | En qué orden atenderla |
| Estado | `bloqueado`, `necesita definición`, `duplicada`, `no se hará` | Por qué no se avanza o por qué se cerró sin hacerla |
| Otros | `buena primera issue` | Tareas acotadas para quien llega nuevo |

## Milestones

- **MVP:** todo lo necesario para la primera versión usable en campo.
- **Usuarios individuales:** cuentas por integrante con registro, aprobación de un admin, roles y trazabilidad. Va antes de lo que falta del MVP.

Las funcionalidades posteriores se agrupan en nuevos milestones a medida que se definan.

## Cambios en la base de datos

- Todo cambio de esquema es una **migración nueva** en `supabase/migrations/` (`npm run db:new nombre`). Nunca se edita una migración que ya se aplicó.
- Nada se cambia a mano desde el panel de Supabase; si se hizo, se pasa a una migración.
- La migración y los tipos regenerados (`npm run db:types`) van en el mismo PR que el código que los usa.
- Commits con el área `db`, por ejemplo: `feat(db): agregar campo horario a ubicaciones`.

## Variables de entorno y secretos

- Las claves (Supabase, proveedor del mapa) van en `.env.local`, que **nunca** se sube a git.
- Si agregas una variable nueva, documéntala en `.env.example` con un comentario.
