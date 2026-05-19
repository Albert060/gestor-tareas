@AGENTS.md
# Prueba Técnica

## Entrega

Repositorio Git con README explicando cómo arrancar el proyecto y las decisiones técnicas tomadas.

## Filosofía de esta prueba

Tienes libertad absoluta para resolverla como quieras, salvo que el lenguaje de programación del backend y frontend tiene que ser JavaScript:

- Cualquier framework, librería o herramienta.
- Cualquier base de datos (relacional, NoSQL, en memoria, fichero JSON…).
- Puedes usar IA (ChatGPT, Claude, Copilot, Cursor…), Stack Overflow, documentación, tutoriales, plantillas, generadores de código, lo que necesites.
- Puedes apoyarte en frameworks frontend (React, Vue, Angular, Svelte…) o ir con HTML/JS puro.

Tú decides. Lo único que pedimos es honestidad: en el README cuenta qué herramientas has usado, dónde has tirado de IA, qué has copiado y de dónde, y por qué tomaste cada decisión técnica. No penaliza usar ayudas; penaliza ocultarlo o no saber explicar el código que entregas.

Lo que evaluamos no es “que sepas hacerlo todo desde cero”, sino cómo piensas, cómo decides y cómo trabajas.

## Ejercicio: GestorTareas

Construye una pequeña aplicación web para gestionar las tareas de un equipo. Debe tener un backend con API, una base de datos (del tipo que sea) y un frontend que la consuma.

### Modelo de datos mínimo

Una tarea tiene al menos:

- Identificador.
- Título.
- Descripción.
- Estado (pendiente / en progreso / completada).
- Prioridad (baja / media / alta).
- Fecha de creación.

Un usuario tiene al menos:

- Identificador.
- Nombre.
- Email.

Cada tarea puede estar asignada a un usuario (relación tarea-usuario).

Puedes añadir más campos si lo crees conveniente, pero justifícalo.

## Funcionalidad

### API / Backend

- Listar tareas (con posibilidad de filtrar por estado y/o usuario asignado).
- Obtener el detalle de una tarea.
- Crear, actualizar y eliminar tareas.
- Listar usuarios y asignar un usuario a una tarea.
- Manejo correcto de errores: respuestas claras cuando algo no existe, faltan datos obligatorios, etc.

### Frontend

- Listado de tareas con su información clave y el usuario asignado.
- Crear una tarea nueva desde un formulario.
- Cambiar el estado de una tarea y eliminarla.
- Filtrar tareas (al menos por estado).
- Que se vea bien en móvil y en escritorio.
- Que muestre algo razonable mientras carga y cuando algo falla.

### Base de datos

- Persistencia real (al reiniciar el servidor, los datos siguen ahí).
- Entrega los scripts, ficheros de migración o seed que hagan falta para arrancarla desde cero.

## Entregables

1. Repositorio Git con historial de commits (no vale un único commit final). Mensajes descriptivos.
2. README que incluya:
   - Cómo arrancar el proyecto paso a paso (alguien que clone el repo debe poder levantarlo).
   - Stack elegido y por qué lo has elegido.
   - Decisiones técnicas relevantes (estructura de carpetas, patrones, librerías destacadas).
   - Qué herramientas o ayudas externas has usado (IA, tutoriales, plantillas…) y para qué.
   - Qué dejaste sin hacer, qué harías diferente con más tiempo, qué mejorarías.
3. El código funcionando.

## Qué vamos a evaluar

- Criterio técnico: ¿elige herramientas razonables para el problema? ¿Sabe justificar por qué?
- Estructura del código: separación de responsabilidades, nombres claros, sin todo metido en un solo archivo.
- Uso de Git: commits con sentido, ramas si procede.
- Calidad del README: que se entienda, que arranque sin sufrimiento, que las decisiones estén explicadas.
- Autonomía y criterio: sabe usar las herramientas a su disposición (IA incluida) sin perder el control de lo que entrega.
- Honestidad y autoconciencia: identifica lo que sabe, lo que no, lo que copió, lo que dejó a medias.
