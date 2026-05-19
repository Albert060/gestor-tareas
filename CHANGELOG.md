# Changelog

## [0.2.0] - 2026-05-19

### Added

- Registro, inicio y cierre de sesion con cookie HTTP-only y sesiones persistidas.
- Modelo de equipos, miembros e invitaciones.
- CRUD de equipos desde la interfaz.
- Eliminacion en cascada de tareas, miembros e invitaciones al borrar un equipo.
- Tareas por equipo con responsable opcional y auto-asignacion.
- Filtros por equipo, estado, prioridad, responsable y busqueda textual.
- Endpoints protegidos para autenticacion, equipos, invitaciones, usuarios visibles y tareas.

### Changed

- La tarea ahora pertenece siempre a un equipo mediante `teamId`.
- La asignacion de tareas pasa de `userId` a `assigneeId`.
- El seed crea usuarios demo, equipos, membresias, tareas e invitaciones.

### Notes

- El esquema `db/schema.sql` esta pensado para crear la base desde cero. Para una base existente haria falta una migracion incremental.
