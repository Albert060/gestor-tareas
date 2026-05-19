"use client";

import { FormEvent, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

type User = {
  id: string;
  name: string;
  email: string;
  _count?: { tasks: number };
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  user: User | null;
};

type TaskForm = {
  title: string;
  description: string;
  priority: TaskPriority;
  userId: string;
};

const statusOptions: Array<{ value: TaskStatus; label: string; short: string }> = [
  { value: "PENDING", label: "Pendiente", short: "P" },
  { value: "IN_PROGRESS", label: "En progreso", short: "EP" },
  { value: "COMPLETED", label: "Completada", short: "C" },
];

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Media" },
  { value: "LOW", label: "Baja" },
];

const emptyForm: TaskForm = {
  title: "",
  description: "",
  priority: "MEDIUM",
  userId: "",
};

const statusStyles: Record<TaskStatus, string> = {
  PENDING: "border-stone-300 bg-stone-100 text-stone-800",
  IN_PROGRESS: "border-sky-300 bg-sky-100 text-sky-900",
  COMPLETED: "border-emerald-300 bg-emerald-100 text-emerald-900",
};

const priorityStyles: Record<TaskPriority, string> = {
  HIGH: "bg-[#f06449] text-white",
  MEDIUM: "bg-[#f7c948] text-stone-950",
  LOW: "bg-[#d5f365] text-stone-950",
};

function getApiError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === "string") return message;
  }

  return fallback;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as T;

  if (!response.ok) {
    throw new Error(getApiError(payload, "No se pudo completar la operacion"));
  }

  return payload;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams();

      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      if (userFilter !== "ALL") params.set("userId", userFilter);
      if (deferredSearch.trim()) params.set("q", deferredSearch.trim());

      const suffix = params.toString() ? `?${params.toString()}` : "";
      const data = await requestJson<{ tasks: Task[] }>(`/api/tasks${suffix}`, { signal });
      setTasks(data.tasks);
    },
    [deferredSearch, priorityFilter, statusFilter, userFilter]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);
        const usersPromise = requestJson<{ users: User[] }>("/api/users", {
          signal: controller.signal,
        });
        const tasksPromise = loadTasks(controller.signal);
        const [usersData] = await Promise.all([usersPromise, tasksPromise]);
        setUsers(usersData.users);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el panel");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadInitialData();

    return () => controller.abort();
  }, [loadTasks]);

  const groupedTasks = useMemo(
    () =>
      statusOptions.map((status) => ({
        ...status,
        tasks: tasks.filter((task) => task.status === status.value),
      })),
    [tasks]
  );

  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "COMPLETED").length;
    const high = tasks.filter((task) => task.priority === "HIGH").length;
    const unassigned = tasks.filter((task) => !task.user).length;

    return {
      total,
      completed,
      high,
      unassigned,
      progress: total ? Math.round((completed / total) * 100) : 0,
    };
  }, [tasks]);

  async function refreshAfterMutation() {
    await loadTasks();
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await requestJson<{ task: Task }>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          userId: form.userId || null,
        }),
      });
      setForm(emptyForm);
      await refreshAfterMutation();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(task: Task, status: TaskStatus) {
    setBusyTaskId(task.id);
    setError(null);

    try {
      await requestJson<{ task: Task }>(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await refreshAfterMutation();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar la tarea");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function deleteTask(task: Task) {
    setBusyTaskId(task.id);
    setError(null);

    try {
      await requestJson<{ message: string }>(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      setTasks((currentTasks) => currentTasks.filter((item) => item.id !== task.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar la tarea");
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f1ea] text-stone-950">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="grid gap-5 border-b-2 border-stone-950 pb-5 lg:grid-cols-[1fr_460px] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#f06449]">
              GestorTareas
            </p>
            <h1 className="mt-3 max-w-4xl text-5xl font-black leading-[0.95] tracking-normal sm:text-7xl lg:text-8xl">
              Tablero de equipo en tiempo real
            </h1>
          </div>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <Metric label="Tareas" value={metrics.total} />
            <Metric label="Avance" value={`${metrics.progress}%`} />
            <Metric label="Alta prioridad" value={metrics.high} />
            <Metric label="Sin responsable" value={metrics.unassigned} />
          </section>
        </header>

        {error ? (
          <div
            role="alert"
            className="border-2 border-[#f06449] bg-white px-4 py-3 text-sm font-bold text-stone-950 shadow-[5px_5px_0_#171512]"
          >
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <form
              onSubmit={createTask}
              className="border-2 border-stone-950 bg-[#fffdf8] p-4 shadow-[7px_7px_0_#171512]"
            >
              <div className="flex items-center justify-between gap-4 border-b border-stone-300 pb-3">
                <h2 className="text-xl font-black">Nueva tarea</h2>
                <span className="rounded-full bg-[#d5f365] px-3 py-1 text-xs font-black uppercase">
                  Crear
                </span>
              </div>

              <label className="mt-4 block text-sm font-black" htmlFor="title">
                Titulo
              </label>
              <input
                id="title"
                required
                maxLength={200}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="mt-2 w-full border-2 border-stone-950 bg-white px-3 py-3 outline-none transition focus:shadow-[4px_4px_0_#d5f365]"
                placeholder="Preparar demo"
              />

              <label className="mt-4 block text-sm font-black" htmlFor="description">
                Descripcion
              </label>
              <textarea
                id="description"
                maxLength={1000}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="mt-2 min-h-28 w-full resize-y border-2 border-stone-950 bg-white px-3 py-3 outline-none transition focus:shadow-[4px_4px_0_#d5f365]"
                placeholder="Contexto, alcance o enlace relevante"
              />

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <FieldSelect
                  id="priority"
                  label="Prioridad"
                  value={form.priority}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, priority: value as TaskPriority }))
                  }
                  options={priorityOptions}
                />
                <FieldSelect
                  id="assignee"
                  label="Responsable"
                  value={form.userId}
                  onChange={(value) => setForm((current) => ({ ...current, userId: value }))}
                  options={[
                    { value: "", label: "Sin asignar" },
                    ...users.map((user) => ({ value: user.id, label: user.name })),
                  ]}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 flex h-12 w-full items-center justify-center border-2 border-stone-950 bg-stone-950 px-4 font-black text-white transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#f7c948] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Anadir tarea"}
              </button>
            </form>

            <section className="border-2 border-stone-950 bg-[#fffdf8] p-4">
              <h2 className="text-xl font-black">Filtros</h2>
              <label className="mt-4 block text-sm font-black" htmlFor="search">
                Buscar
              </label>
              <input
                id="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="mt-2 w-full border-2 border-stone-950 bg-white px-3 py-3 outline-none transition focus:shadow-[4px_4px_0_#d5f365]"
                placeholder="Titulo o descripcion"
              />

              <div className="mt-4 grid gap-3">
                <FieldSelect
                  id="status-filter"
                  label="Estado"
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as TaskStatus | "ALL")}
                  options={[{ value: "ALL", label: "Todos" }, ...statusOptions]}
                />
                <FieldSelect
                  id="priority-filter"
                  label="Prioridad"
                  value={priorityFilter}
                  onChange={(value) => setPriorityFilter(value as TaskPriority | "ALL")}
                  options={[{ value: "ALL", label: "Todas" }, ...priorityOptions]}
                />
                <FieldSelect
                  id="user-filter"
                  label="Responsable"
                  value={userFilter}
                  onChange={setUserFilter}
                  options={[
                    { value: "ALL", label: "Todos" },
                    ...users.map((user) => ({ value: user.id, label: user.name })),
                  ]}
                />
              </div>
            </section>
          </aside>

          <section className="min-w-0">
            {loading ? (
              <div className="grid gap-4 xl:grid-cols-3">
                {statusOptions.map((status) => (
                  <div key={status.value} className="min-h-80 animate-pulse border-2 border-stone-300 bg-white/60 p-4" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-3">
                {groupedTasks.map((group) => (
                  <section key={group.value} className="min-w-0 border-2 border-stone-950 bg-[#fffdf8]">
                    <div className="flex items-center justify-between border-b-2 border-stone-950 px-4 py-3">
                      <h2 className="text-lg font-black">{group.label}</h2>
                      <span className="grid h-9 min-w-9 place-items-center border-2 border-stone-950 bg-[#d5f365] px-2 font-black">
                        {group.tasks.length}
                      </span>
                    </div>

                    <div className="space-y-3 p-3">
                      {group.tasks.length ? (
                        group.tasks.map((task) => (
                          <article
                            key={task.id}
                            className="border-2 border-stone-950 bg-white p-4 shadow-[4px_4px_0_#171512] transition hover:-translate-y-0.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="break-words text-lg font-black leading-tight">
                                  {task.title}
                                </h3>
                                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                                  {formatDate(task.createdAt)}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 px-2 py-1 text-xs font-black ${priorityStyles[task.priority]}`}
                              >
                                {priorityOptions.find((option) => option.value === task.priority)?.label}
                              </span>
                            </div>

                            {task.description ? (
                              <p className="mt-3 break-words text-sm leading-6 text-stone-700">
                                {task.description}
                              </p>
                            ) : null}

                            <div className="mt-4 flex items-center gap-3 border-t border-stone-200 pt-3">
                              {task.user ? (
                                <>
                                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-950 text-sm font-black text-white">
                                    {initials(task.user.name)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-black">{task.user.name}</p>
                                    <p className="truncate text-xs text-stone-500">{task.user.email}</p>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm font-black text-stone-500">Sin responsable</p>
                              )}
                            </div>

                            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                              <select
                                value={task.status}
                                disabled={busyTaskId === task.id}
                                onChange={(event) =>
                                  updateTaskStatus(task, event.target.value as TaskStatus)
                                }
                                className={`min-w-0 border-2 px-3 py-2 text-sm font-black outline-none ${statusStyles[task.status]}`}
                                aria-label={`Cambiar estado de ${task.title}`}
                              >
                                {statusOptions.map((status) => (
                                  <option key={status.value} value={status.value}>
                                    {status.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={busyTaskId === task.id}
                                onClick={() => deleteTask(task)}
                                className="h-11 border-2 border-stone-950 bg-white px-3 text-sm font-black transition hover:bg-[#f06449] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`Eliminar ${task.title}`}
                                title="Eliminar"
                              >
                                X
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="border-2 border-dashed border-stone-300 px-4 py-10 text-center text-sm font-black text-stone-500">
                          Sin tareas
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-2 border-stone-950 bg-[#fffdf8] p-3 shadow-[4px_4px_0_#171512]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-black leading-none">{value}</p>
    </div>
  );
}

function FieldSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-black" htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border-2 border-stone-950 bg-white px-3 py-3 outline-none transition focus:shadow-[4px_4px_0_#d5f365]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
