# GestorTareas

Aplicacion web para gestionar tareas por equipos. Incluye autenticacion, seleccion de tablero por equipo, invitaciones por email, asignacion de responsables, auto-asignacion opcional y CRUD de tareas/equipos con persistencia PostgreSQL.

## Stack

- Next.js 16 con App Router, React 19 y JavaScript/TypeScript.
- Tailwind CSS 4 para estilos utilitarios.
- Neon Serverless Postgres para persistencia real.
- Zod para validacion de entrada en la API.
- Autenticacion propia con cookie HTTP-only, sesiones persistidas y hash de contrasena con `scrypt` de Node.js.

Se eligio Next.js porque permite entregar frontend y backend en un unico proyecto JavaScript, con rutas API cercanas a la UI. Neon aporta PostgreSQL real sin infraestructura local, y `scrypt` evita anadir dependencias para una prueba tecnica pequena.

## Arranque

1. Instala dependencias:

```bash
pnpm install
```

2. Crea `.env` con una cadena de conexion PostgreSQL:

```bash
DATABASE_URL="postgresql://usuario:password@host/database?sslmode=require"
```

3. Crea el esquema en la base de datos usando `db/schema.sql`.

4. Carga datos iniciales:

```bash
pnpm seed
```

Usuarios demo:

- `albert@gmail.com`
- `joaquin@gmail.com`

Contrasena para albert: `albert1234`.
Contrasena para joaquin: `joaquin1234`.

5. Arranca el entorno local:

```bash
pnpm dev
```

La app queda disponible en `http://localhost:3000`.

## API

- `GET /api/auth/me`: devuelve usuario actual, equipos e invitaciones pendientes.
- `POST /api/auth/register`: registra usuario e inicia sesion.
- `POST /api/auth/login`: inicia sesion.
- `POST /api/auth/logout`: cierra sesion.
- `GET /api/teams`: lista equipos del usuario autenticado.
- `POST /api/teams`: crea equipo y agrega al creador como miembro.
- `GET /api/teams/:id`: detalle de equipo si el usuario es miembro.
- `PUT /api/teams/:id`: actualiza nombre/descripcion del equipo.
- `DELETE /api/teams/:id`: elimina equipo, miembros, invitaciones y tareas por cascada.
- `GET /api/teams/:id/members`: lista miembros del equipo.
- `GET /api/teams/:id/invitations`: lista invitaciones del equipo.
- `POST /api/teams/:id/invitations`: invita por email.
- `POST /api/invitations/:id/accept`: acepta una invitacion pendiente del usuario.
- `GET /api/tasks`: lista tareas. Requiere `teamId`; filtros: `status`, `priority`, `assigneeId`, `q`.
- `POST /api/tasks`: crea una tarea en un equipo, con `assigneeId` opcional o `autoAssign`.
- `GET /api/tasks/:id`: detalle de tarea visible para miembros del equipo.
- `PUT /api/tasks/:id`: actualiza estado, prioridad, responsable, titulo o descripcion.
- `DELETE /api/tasks/:id`: elimina una tarea.
- `GET /api/users`: lista usuarios visibles en equipos compartidos.
- `GET /api/users/:id`: detalle de usuario visible y sus tareas compartidas.

## Decisiones tecnicas

- El equipo es la frontera de acceso: cualquier operacion de tarea valida sesion y pertenencia al equipo.
- No hay roles; todos los miembros pueden crear, editar, invitar y eliminar, tal como pide el alcance actual.
- `TeamMember` y `Task` usan `ON DELETE CASCADE` desde `Team`, asi eliminar un equipo borra participantes, invitaciones y tareas.
- Las tareas usan `assigneeId` nullable para permitir tareas sin responsable.
- La UI principal vive en `app/task-board.tsx` como componente cliente porque concentra formularios, filtros y mutaciones.
- Las consultas comunes de equipo/tareas se centralizan en `lib/team-queries.js`; autenticacion y checks de membresia viven en `lib/auth.js`.
- La API usa SQL parametrizado mediante `lib/db.js` para evitar inyeccion y centralizar mapeos.

## Herramientas y ayudas

- Se uso IA para revisar `CLAUDE.md`, `AGENTS.md`, la carpeta `agents` y las skills de `.agents`.
- Se aplicaron las guias locales de `frontend-design`, `next-best-practices`, `nodejs-backend-patterns` y `tailwind-css-patterns`.
- No se copiaron plantillas externas para la interfaz.

## Verificacion

```bash
pnpm lint
pnpm build
```

Ambos comandos se ejecutaron correctamente.

## Pendiente con mas tiempo

- Tests automatizados de Route Handlers y flujos principales de UI.
- Flujo para rechazar/cancelar invitaciones.
- Recuperacion de contrasena y endurecimiento extra de seguridad para produccion.
- Auditoria visual con Playwright en varios breakpoints.
