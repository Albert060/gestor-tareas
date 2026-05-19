# GestorTareas

Aplicacion web para gestionar tareas de equipo. Incluye API REST con Next.js Route Handlers, persistencia en PostgreSQL via Neon Serverless y una UI responsive para crear, filtrar, cambiar estado y eliminar tareas.

## Stack

- Next.js 16 con App Router, React 19 y JavaScript/TypeScript.
- Tailwind CSS 4 para estilos utilitarios.
- Neon Serverless Postgres para persistencia real.
- Zod para validacion de entrada en la API.

Se eligio Next.js porque permite entregar frontend y backend en un unico proyecto JavaScript, con rutas API cercanas a la UI y una estructura sencilla para una prueba tecnica pequena. Neon encaja bien porque ofrece PostgreSQL real sin levantar infraestructura local.

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

5. Arranca el entorno local:

```bash
pnpm dev
```

La app queda disponible en `http://localhost:3000`.

## API

- `GET /api/tasks`: lista tareas. Filtros: `status`, `priority`, `userId`, `q`.
- `POST /api/tasks`: crea una tarea.
- `GET /api/tasks/:id`: detalle de una tarea.
- `PUT /api/tasks/:id`: actualiza parcialmente una tarea.
- `DELETE /api/tasks/:id`: elimina una tarea.
- `GET /api/users`: lista usuarios con contador de tareas.
- `POST /api/users`: crea un usuario.
- `GET /api/users/:id`: detalle de usuario con tareas.
- `DELETE /api/users/:id`: elimina un usuario y desasigna sus tareas.

## Decisiones tecnicas

- La UI principal vive en `app/task-board.tsx` como componente cliente porque necesita filtros interactivos, formularios y mutaciones optimistas.
- `app/page.tsx` se mantiene fino y solo compone el tablero.
- La API usa SQL parametrizado mediante `lib/db.js` para evitar inyeccion y centralizar el mapeo de filas.
- Las validaciones estan en `lib/validations.js`; los errores salen con formato consistente desde `lib/api-helpers.js`.
- Se agregaron filtros de prioridad y busqueda textual para que el tablero sea util cuando crece el numero de tareas.
- El diseno prioriza una experiencia operativa: metricas arriba, formulario y filtros persistentes, columnas por estado y acciones directas en cada tarea.

## Herramientas y ayudas

- Se uso IA para revisar los requisitos del `CLAUDE.md`, `AGENTS.md` y `.agents`, disenar la UX e implementar los cambios.
- Se siguieron las guias locales de `.agents/skills/frontend-design`, `.agents/skills/next-best-practices`, `.agents/skills/react-best-practices` y `.agents/skills/tailwind-css-patterns`.
- No se copiaron plantillas externas para la interfaz.

## Verificacion

```bash
pnpm lint
pnpm build
```

Ambos comandos se ejecutaron correctamente.

## Pendiente con mas tiempo

- Tests automatizados para Route Handlers y flujos principales de UI.
- Edicion completa de titulo, descripcion, prioridad y responsable desde la tarjeta.
- Paginacion o scroll virtual si el volumen de tareas crece mucho.
- Autenticacion y permisos por rol para equipos reales.
