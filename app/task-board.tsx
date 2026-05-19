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

type Team = {
  id: string;
  name: string;
  description: string | null;
  membersCount?: number;
  tasksCount?: number;
};

type Invitation = {
  id: string;
  teamId: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  team?: Team;
};

type Task = {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  assigneeId: string | null;
  assignee: User | null;
};

type TaskForm = {
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeId: string;
  autoAssign: boolean;
};

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: "PENDING", label: "Pendiente" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completada" },
];

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Media" },
  { value: "LOW", label: "Baja" },
];

const emptyTaskForm: TaskForm = {
  title: "",
  description: "",
  priority: "MEDIUM",
  assigneeId: "",
  autoAssign: false,
};

const statusStyles: Record<TaskStatus, string> = {
  PENDING: "border-stone-300 bg-stone-100 text-stone-800",
  IN_PROGRESS: "border-cyan-300 bg-cyan-100 text-cyan-950",
  COMPLETED: "border-emerald-300 bg-emerald-100 text-emerald-950",
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<Invitation[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [newTeamForm, setNewTeamForm] = useState({ name: "", description: "" });
  const [editTeamForm, setEditTeamForm] = useState({ name: "", description: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

  const loadSession = useCallback(async () => {
    const data = await requestJson<{
      user: User | null;
      teams: Team[];
      invitations: Invitation[];
    }>("/api/auth/me");

    setCurrentUser(data.user);
    setTeams(data.teams);
    setPendingInvitations(data.invitations);

    if (!selectedTeamId && data.teams.length) {
      setSelectedTeamId(data.teams[0].id);
      setEditTeamForm({
        name: data.teams[0].name,
        description: data.teams[0].description ?? "",
      });
    }

    if (selectedTeamId && !data.teams.some((team) => team.id === selectedTeamId)) {
      const nextTeam = data.teams[0];
      setSelectedTeamId(nextTeam?.id ?? "");
      setEditTeamForm({
        name: nextTeam?.name ?? "",
        description: nextTeam?.description ?? "",
      });
    }
  }, [selectedTeamId]);

  const loadTeamData = useCallback(
    async (signal?: AbortSignal) => {
      if (!selectedTeamId) {
        setTasks([]);
        setMembers([]);
        setTeamInvitations([]);
        return;
      }

      const params = new URLSearchParams({ teamId: selectedTeamId });

      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      if (assigneeFilter !== "ALL") params.set("assigneeId", assigneeFilter);
      if (deferredSearch.trim()) params.set("q", deferredSearch.trim());

      const [tasksData, membersData, invitationsData] = await Promise.all([
        requestJson<{ tasks: Task[] }>(`/api/tasks?${params.toString()}`, { signal }),
        requestJson<{ members: User[] }>(`/api/teams/${selectedTeamId}/members`, { signal }),
        requestJson<{ invitations: Invitation[] }>(`/api/teams/${selectedTeamId}/invitations`, {
          signal,
        }),
      ]);

      setTasks(tasksData.tasks);
      setMembers(membersData.members);
      setTeamInvitations(invitationsData.invitations);
    },
    [assigneeFilter, deferredSearch, priorityFilter, selectedTeamId, statusFilter]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        await loadSession();
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la sesion");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [loadSession]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError(null);
        await loadTeamData(controller.signal);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el equipo");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [currentUser, loadTeamData]);

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
    const unassigned = tasks.filter((task) => !task.assignee).length;

    return {
      total,
      completed,
      high,
      unassigned,
      progress: total ? Math.round((completed / total) * 100) : 0,
    };
  }, [tasks]);

  async function refreshAll() {
    await loadSession();
    await loadTeamData();
  }

  function selectTeam(teamId: string) {
    const nextTeam = teams.find((team) => team.id === teamId);
    setSelectedTeamId(teamId);
    setEditTeamForm({
      name: nextTeam?.name ?? "",
      description: nextTeam?.description ?? "",
    });
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await requestJson<{ user: User }>(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          authMode === "register"
            ? authForm
            : { email: authForm.email, password: authForm.password }
        ),
      });
      setAuthForm({ name: "", email: "", password: "" });
      await loadSession();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo iniciar sesion");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await requestJson<{ message: string }>("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setTeams([]);
    setTasks([]);
    setMembers([]);
    setSelectedTeamId("");
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const data = await requestJson<{ team: Team }>("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamForm.name,
          description: newTeamForm.description || null,
        }),
      });
      setNewTeamForm({ name: "", description: "" });
      setSelectedTeamId(data.team.id);
      await loadSession();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear el equipo");
    } finally {
      setSaving(false);
    }
  }

  async function updateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTeam) return;

    setSaving(true);
    setError(null);

    try {
      const data = await requestJson<{ team: Team }>(`/api/teams/${selectedTeam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editTeamForm.name,
          description: editTeamForm.description || null,
        }),
      });
      setEditTeamForm({
        name: data.team.name,
        description: data.team.description ?? "",
      });
      await refreshAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el equipo");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeam() {
    if (!selectedTeam || !confirm(`Eliminar ${selectedTeam.name} y todas sus tareas?`)) return;

    setSaving(true);
    setError(null);

    try {
      await requestJson<{ message: string }>(`/api/teams/${selectedTeam.id}`, { method: "DELETE" });
      setSelectedTeamId("");
      await loadSession();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar el equipo");
    } finally {
      setSaving(false);
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTeamId) return;

    setSaving(true);
    setError(null);

    try {
      await requestJson<{ invitation: Invitation }>(`/api/teams/${selectedTeamId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      setInviteEmail("");
      await loadTeamData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo invitar");
    } finally {
      setSaving(false);
    }
  }

  async function acceptInvitation(invitation: Invitation) {
    setSaving(true);
    setError(null);

    try {
      await requestJson<{ message: string }>(`/api/invitations/${invitation.id}/accept`, {
        method: "POST",
      });
      setSelectedTeamId(invitation.teamId);
      await loadSession();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo aceptar");
    } finally {
      setSaving(false);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTeamId) return;

    setSaving(true);
    setError(null);

    try {
      await requestJson<{ task: Task }>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeamId,
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          assigneeId: taskForm.autoAssign ? null : taskForm.assigneeId || null,
          autoAssign: taskForm.autoAssign,
        }),
      });
      setTaskForm(emptyTaskForm);
      await loadTeamData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(task: Task, body: Partial<Task> & { autoAssign?: boolean }) {
    setBusyTaskId(task.id);
    setError(null);

    try {
      await requestJson<{ task: Task }>(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await loadTeamData();
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
      await requestJson<{ message: string }>(`/api/tasks/${task.id}`, { method: "DELETE" });
      setTasks((currentTasks) => currentTasks.filter((item) => item.id !== task.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar la tarea");
    } finally {
      setBusyTaskId(null);
    }
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-[#f4f1ea] px-4 py-6 text-stone-950 sm:px-6 lg:px-8">
        <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
          <div className="border-y-2 border-stone-950 py-8">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#f06449]">
              GestorTareas
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.95] sm:text-7xl">
              Entra, elige equipo y trabaja desde un tablero claro.
            </h1>
          </div>

          <form
            onSubmit={submitAuth}
            className="border-2 border-stone-950 bg-[#fffdf8] p-5 shadow-[8px_8px_0_#171512]"
          >
            <div className="grid grid-cols-2 border-2 border-stone-950 text-sm font-black">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`h-11 ${authMode === "login" ? "bg-stone-950 text-white" : "bg-white"}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`h-11 ${authMode === "register" ? "bg-stone-950 text-white" : "bg-white"}`}
              >
                Registro
              </button>
            </div>

            {authMode === "register" ? (
              <FieldInput
                id="auth-name"
                label="Nombre"
                value={authForm.name}
                onChange={(value) => setAuthForm((current) => ({ ...current, name: value }))}
              />
            ) : null}
            <FieldInput
              id="auth-email"
              label="Email"
              type="email"
              value={authForm.email}
              onChange={(value) => setAuthForm((current) => ({ ...current, email: value }))}
            />
            <FieldInput
              id="auth-password"
              label="Contrasena"
              type="password"
              value={authForm.password}
              onChange={(value) => setAuthForm((current) => ({ ...current, password: value }))}
            />

            {error ? <Alert message={error} /> : null}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 h-12 w-full border-2 border-stone-950 bg-stone-950 px-4 font-black text-white transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#d5f365] disabled:opacity-60"
            >
              {saving ? "Procesando..." : authMode === "login" ? "Iniciar sesion" : "Crear cuenta"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f1ea] text-stone-950">
      <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="grid gap-5 border-b-2 border-stone-950 pb-5 xl:grid-cols-[1fr_520px] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#f06449]">
                GestorTareas
              </p>
              <button
                type="button"
                onClick={logout}
                className="border-2 border-stone-950 bg-white px-3 py-1 text-xs font-black"
              >
                Salir
              </button>
            </div>
            <h1 className="mt-3 max-w-5xl text-5xl font-black leading-[0.95] sm:text-7xl lg:text-8xl">
              {selectedTeam ? selectedTeam.name : "Elige un equipo"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-bold text-stone-600">
              {selectedTeam?.description || `Sesion de ${currentUser.name}`}
            </p>
          </div>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
            <Metric label="Tareas" value={metrics.total} />
            <Metric label="Avance" value={`${metrics.progress}%`} />
            <Metric label="Alta prioridad" value={metrics.high} />
            <Metric label="Sin responsable" value={metrics.unassigned} />
          </section>
        </header>

        {error ? <Alert message={error} /> : null}

        {pendingInvitations.length ? (
          <section className="grid gap-2 border-2 border-stone-950 bg-[#fffdf8] p-3">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-black">
                  Invitacion pendiente a {invitation.team?.name ?? "equipo"}
                </p>
                <button
                  type="button"
                  onClick={() => acceptInvitation(invitation)}
                  className="border-2 border-stone-950 bg-[#d5f365] px-3 py-2 text-sm font-black"
                >
                  Aceptar
                </button>
              </div>
            ))}
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section className="border-2 border-stone-950 bg-[#fffdf8] p-4 shadow-[7px_7px_0_#171512]">
              <h2 className="text-xl font-black">Equipos</h2>
              <FieldSelect
                id="team-selector"
                label="Tablero activo"
                value={selectedTeamId}
                onChange={selectTeam}
                options={[
                  { value: "", label: "Selecciona equipo" },
                  ...teams.map((team) => ({ value: team.id, label: team.name })),
                ]}
              />

              <form onSubmit={createTeam} className="mt-4 border-t border-stone-300 pt-4">
                <FieldInput
                  id="team-name"
                  label="Nuevo equipo"
                  value={newTeamForm.name}
                  onChange={(value) => setNewTeamForm((current) => ({ ...current, name: value }))}
                />
                <FieldInput
                  id="team-description"
                  label="Descripcion"
                  value={newTeamForm.description}
                  onChange={(value) =>
                    setNewTeamForm((current) => ({ ...current, description: value }))
                  }
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-4 h-11 w-full border-2 border-stone-950 bg-[#d5f365] px-4 font-black"
                >
                  Crear equipo
                </button>
              </form>

              {selectedTeam ? (
                <form onSubmit={updateTeam} className="mt-4 border-t border-stone-300 pt-4">
                  <FieldInput
                    id="edit-team-name"
                    label="Nombre del equipo"
                    value={editTeamForm.name}
                    onChange={(value) => setEditTeamForm((current) => ({ ...current, name: value }))}
                  />
                  <FieldInput
                    id="edit-team-description"
                    label="Descripcion del equipo"
                    value={editTeamForm.description}
                    onChange={(value) =>
                      setEditTeamForm((current) => ({ ...current, description: value }))
                    }
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-11 w-full border-2 border-stone-950 bg-white px-4 font-black"
                  >
                    Guardar nombre/descripcion
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={deleteTeam}
                    className="mt-2 h-11 w-full border-2 border-stone-950 bg-[#f06449] px-4 font-black text-white"
                  >
                    Eliminar equipo
                  </button>
                </form>
              ) : null}
            </section>

            {selectedTeam ? (
              <>
                <form
                  onSubmit={createTask}
                  className="border-2 border-stone-950 bg-[#fffdf8] p-4 shadow-[7px_7px_0_#171512]"
                >
                  <h2 className="text-xl font-black">Nueva tarea</h2>
                  <FieldInput
                    id="title"
                    label="Titulo"
                    value={taskForm.title}
                    onChange={(value) => setTaskForm((current) => ({ ...current, title: value }))}
                  />
                  <label className="mt-4 block text-sm font-black" htmlFor="description">
                    Descripcion
                    <textarea
                      id="description"
                      maxLength={1000}
                      value={taskForm.description}
                      onChange={(event) =>
                        setTaskForm((current) => ({ ...current, description: event.target.value }))
                      }
                      className="mt-2 min-h-24 w-full resize-y border-2 border-stone-950 bg-white px-3 py-3 outline-none transition focus:shadow-[4px_4px_0_#d5f365]"
                    />
                  </label>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <FieldSelect
                      id="priority"
                      label="Prioridad"
                      value={taskForm.priority}
                      onChange={(value) =>
                        setTaskForm((current) => ({ ...current, priority: value as TaskPriority }))
                      }
                      options={priorityOptions}
                    />
                    <FieldSelect
                      id="assignee"
                      label="Responsable"
                      value={taskForm.assigneeId}
                      onChange={(value) =>
                        setTaskForm((current) => ({ ...current, assigneeId: value }))
                      }
                      options={[
                        { value: "", label: "Sin asignar" },
                        ...members.map((member) => ({ value: member.id, label: member.name })),
                      ]}
                    />
                  </div>
                  <label className="mt-4 flex items-center gap-3 text-sm font-black">
                    <input
                      type="checkbox"
                      checked={taskForm.autoAssign}
                      onChange={(event) =>
                        setTaskForm((current) => ({ ...current, autoAssign: event.target.checked }))
                      }
                      className="h-5 w-5 accent-stone-950"
                    />
                    Auto-asignarme
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-5 h-12 w-full border-2 border-stone-950 bg-stone-950 px-4 font-black text-white transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#f7c948] disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : "Anadir tarea"}
                  </button>
                </form>

                <section className="border-2 border-stone-950 bg-[#fffdf8] p-4">
                  <h2 className="text-xl font-black">Filtros</h2>
                  <FieldInput id="search" label="Buscar" value={search} onChange={setSearch} />
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
                      id="assignee-filter"
                      label="Responsable"
                      value={assigneeFilter}
                      onChange={setAssigneeFilter}
                      options={[
                        { value: "ALL", label: "Todos" },
                        ...members.map((member) => ({ value: member.id, label: member.name })),
                      ]}
                    />
                  </div>
                </section>

                <form onSubmit={inviteMember} className="border-2 border-stone-950 bg-[#fffdf8] p-4">
                  <h2 className="text-xl font-black">Invitar</h2>
                  <FieldInput
                    id="invite-email"
                    label="Email"
                    type="email"
                    value={inviteEmail}
                    onChange={setInviteEmail}
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-4 h-11 w-full border-2 border-stone-950 bg-white px-4 font-black"
                  >
                    Enviar invitacion
                  </button>
                  <div className="mt-4 space-y-2 text-xs font-bold text-stone-600">
                    {teamInvitations.slice(0, 5).map((invitation) => (
                      <p key={invitation.id}>
                        {invitation.email} - {invitation.status}
                      </p>
                    ))}
                  </div>
                </form>
              </>
            ) : null}
          </aside>

          <section className="min-w-0">
            {!selectedTeam ? (
              <div className="border-2 border-dashed border-stone-400 bg-white/60 px-4 py-16 text-center text-lg font-black">
                Crea o selecciona un equipo para ver el tablero.
              </div>
            ) : loading ? (
              <div className="grid gap-4 xl:grid-cols-3">
                {statusOptions.map((status) => (
                  <div
                    key={status.value}
                    className="min-h-80 animate-pulse border-2 border-stone-300 bg-white/60 p-4"
                  />
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
                              {task.assignee ? (
                                <>
                                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-950 text-sm font-black text-white">
                                    {initials(task.assignee.name)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-black">{task.assignee.name}</p>
                                    <p className="truncate text-xs text-stone-500">{task.assignee.email}</p>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm font-black text-stone-500">Sin responsable</p>
                              )}
                            </div>

                            <div className="mt-4 grid gap-2">
                              <select
                                value={task.status}
                                disabled={busyTaskId === task.id}
                                onChange={(event) =>
                                  updateTask(task, { status: event.target.value as TaskStatus })
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
                              <select
                                value={task.assigneeId ?? ""}
                                disabled={busyTaskId === task.id}
                                onChange={(event) =>
                                  updateTask(task, { assigneeId: event.target.value || null })
                                }
                                className="min-w-0 border-2 border-stone-950 bg-white px-3 py-2 text-sm font-black outline-none"
                                aria-label={`Asignar ${task.title}`}
                              >
                                <option value="">Sin asignar</option>
                                {members.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                  </option>
                                ))}
                              </select>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={busyTaskId === task.id}
                                  onClick={() => updateTask(task, { autoAssign: true })}
                                  className="h-11 border-2 border-stone-950 bg-[#d5f365] px-3 text-sm font-black disabled:opacity-60"
                                >
                                  Para mi
                                </button>
                                <button
                                  type="button"
                                  disabled={busyTaskId === task.id}
                                  onClick={() => deleteTask(task)}
                                  className="h-11 border-2 border-stone-950 bg-white px-3 text-sm font-black transition hover:bg-[#f06449] hover:text-white disabled:opacity-60"
                                  aria-label={`Eliminar ${task.title}`}
                                >
                                  Eliminar
                                </button>
                              </div>
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

function Alert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-4 border-2 border-[#f06449] bg-white px-4 py-3 text-sm font-bold text-stone-950 shadow-[5px_5px_0_#171512]"
    >
      {message}
    </div>
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

function FieldInput({
  id,
  label,
  value,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 block text-sm font-black" htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        required={type !== "text" || id !== "team-description"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border-2 border-stone-950 bg-white px-3 py-3 outline-none transition focus:shadow-[4px_4px_0_#d5f365]"
      />
    </label>
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
    <label className="mt-4 block text-sm font-black" htmlFor={id}>
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
