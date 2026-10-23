"use client";
import { useEffect, useState, useMemo, type FormEvent } from "react";
import {
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Users,
  BarChart3,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Search,
  ArrowUpRight,
  ChevronRight,
  FileText,
  UsersRound,
  CheckCircle2,
  Menu,
  ChevronDown,
  Download,
  WifiOff,
  LoaderCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { firebase } from "@/lib/firebase";
import {
  defaultSettings,
  blankActivity,
  emptyInstitution,
  errorMessage,
  statusLabels,
  isApproved,
  dateKey,
  type Activity,
  type Profile,
  type Institution,
  type Notice,
  type Settings,
} from "@/lib/models";
import {
  syncProfile,
  subscribe,
  normalizeActivity,
  normalizeInstitution,
  patchRecord,
  putRecord,
  removeRecord,
} from "@/lib/repository";
import { exportCsv, exportExcel, exportPdf } from "@/lib/reports";
import AuthScreen from "./auth-screen";
import ActivityForm, { InstitutionFields } from "./activity-form";
import ActivityDetail from "./activity-detail";

type View =
  | "home"
  | "activities"
  | "institutions"
  | "users"
  | "reports"
  | "notifications"
  | "settings";
const nav = [
  ["home", "Resumen", LayoutDashboard],
  ["activities", "Actividades", CalendarDays],
  ["institutions", "Instituciones", Building2],
  ["reports", "Reportes", BarChart3],
  ["users", "Usuarios", Users],
] as const;
export default function TheatreApp() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [online, setOnline] = useState(true);
  const [view, setView] = useState<View>("home");
  const [menu, setMenu] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [editor, setEditor] = useState<Activity | null | undefined>(undefined);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const admin = profile?.role?.trim().toUpperCase() === "ADMIN";
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    let alive = true;
    const stop = onAuthStateChanged(firebase().auth, (user) => {
      setProfile(null);
      setAuthUser(user);
      setReady(true);
      if (user)
        syncProfile(user).catch((e) => {
          if (alive) setError(errorMessage(e));
        });
    });
    return () => {
      alive = false;
      stop();
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!authUser) return;
    return onSnapshot(
      doc(firebase().db, "users", authUser.uid),
      (snap) => {
        if (snap.exists()) setProfile(snap.data() as Profile);
      },
      (e) => setError(errorMessage(e)),
    );
  }, [authUser]);
  useEffect(() => {
    if (
      !profile ||
      !profile.active ||
      !authUser ||
      (!authUser.emailVerified &&
        !authUser.providerData.some((p) => p.providerId === "google.com"))
    )
      return;
    setLoadingData(true);
    const fail = (e: Error) => {
      setError(errorMessage(e));
      setLoadingData(false);
    };
    const stops = [
      subscribe<Activity>(
        "activities",
        (list) => {
          setActivities(
            list
              .map(normalizeActivity)
              .sort(
                (a, b) =>
                  (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
              ),
          );
          setLoadingData(false);
        },
        fail,
        admin ? undefined : ["responsibleId", profile.uid],
      ),
      subscribe<Institution>(
        "institutions",
        (list) =>
          setInstitutions(
            list
              .map(normalizeInstitution)
              .sort((a, b) => a.name.localeCompare(b.name, "es")),
          ),
        fail,
      ),
      subscribe<Notice>(
        "notifications",
        (list) =>
          setNotices(
            list.sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            ),
          ),
        fail,
        ["userId", profile.uid],
      ),
      onSnapshot(
        doc(firebase().db, "appData", "settings"),
        (snap) => {
          if (snap.exists())
            setSettings({ ...defaultSettings, ...snap.data() } as Settings);
        },
        fail,
      ),
    ];
    if (admin) stops.push(subscribe<Profile>("users", setUsers, fail));
    return () => {
      stops.forEach((stop) => stop());
      setActivities([]);
      setNotices([]);
      setUsers([]);
    };
  }, [profile?.uid, profile?.active, admin, authUser]);
  const filtered = useMemo(
    () =>
      activities.filter(
        (a) =>
          `${a.nombreActividad} ${a.code} ${a.responsibleName} ${a.areaIncidencia}`
            .toLocaleLowerCase("es")
            .includes(search.toLocaleLowerCase("es")) &&
          (!status ||
            (status === "APPROVED"
              ? isApproved(a.status)
              : a.status === status)) &&
          (!from || dateKey(a.fecha) >= from) &&
          (!to || dateKey(a.fecha) <= to),
      ),
    [activities, search, status, from, to],
  );
  async function action(fn: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError("");
    try {
      await fn();
      if (success) setMessage(success);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: View) {
    if (
      editor !== undefined &&
      !window.confirm(
        "El texto se conserva localmente. Los archivos pendientes deben seleccionarse de nuevo. ¿Salir del formulario?",
      )
    )
      return;
    setView(next);
    setSelected(null);
    setEditor(undefined);
    setMenu(false);
    setSearch("");
    setStatus("");
    setFrom("");
    setTo("");
  }
  function openActivity(a: Activity) {
    setSelected(a);
    setEditor(undefined);
    setView("activities");
  }
  if (!ready)
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" />
        <p>Cargando Teatro Pablo Tesak…</p>
      </div>
    );
  if (!authUser) return <AuthScreen />;
  if (!profile)
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" />
        <p>Preparando tu perfil…</p>
        {error && <p role="alert">{error}</p>}
        <button className="secondary" onClick={() => signOut(firebase().auth)}>
          Volver al inicio de sesión
        </button>
      </div>
    );
  if (!profile.active)
    return (
      <div className="loading-screen">
        <h1>Cuenta desactivada</h1>
        <p>Solicita la revisión de tu acceso al administrador.</p>
        <button className="primary" onClick={() => signOut(firebase().auth)}>
          Cerrar sesión
        </button>
      </div>
    );
  if (
    !authUser.emailVerified &&
    !authUser.providerData.some((p) => p.providerId === "google.com")
  )
    return (
      <div className="loading-screen">
        <h1>Verifica tu correo</h1>
        <p>
          Abre el enlace de verificación enviado a tu correo y vuelve a iniciar
          sesión.
        </p>
        <button
          className="primary"
          disabled={busy}
          onClick={() =>
            action(
              () => sendEmailVerification(authUser),
              "Correo de verificación enviado.",
            )
          }
        >
          Reenviar verificación
        </button>
        {message && <p>{message}</p>}
        {error && <p role="alert">{error}</p>}
        <button className="secondary" onClick={() => signOut(firebase().auth)}>
          Volver a iniciar sesión
        </button>
      </div>
    );
  const unread = notices.filter((n) => !n.isRead).length;
  const totalPeople = activities
    .filter((a) => a.status !== "DRAFT")
    .reduce((sum, a) => sum + a.participants.totalGeneral, 0);
  const dateLabel = new Intl.DateTimeFormat("es-SV", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/El_Salvador",
  }).format(new Date());
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a href="/" className="sidebar-brand">
          <img src="/logo-teatro-pablo-tesak.png" alt="Teatro Pablo Tesak" />
          <div>
            Teatro Pablo Tesak<small>GESTIÓN INSTITUCIONAL</small>
          </div>
        </a>
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <nav aria-label="Navegación principal">
          {nav
            .filter(([id]) => id !== "users" || admin)
            .map(([id, label, Icon]) => (
              <button
                key={id}
                className={view === id ? "active" : ""}
                onClick={() => navigate(id)}
              >
                <Icon size={19} />
                <span>{label}</span>
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-chip">
            <div className="avatar">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{profile.fullName}</strong>
              <small>{admin ? "Administrador" : "Usuario"}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              onClick={() =>
                action(async () => {
                  await signOut(firebase().auth);
                  setEditor(undefined);
                  setSelected(null);
                  setError("");
                })
              }
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-shade"
          aria-label="Cerrar menú"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Abrir menú"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={22} />
          </button>
          <span>
            Teatro Pablo Tesak <ChevronRight size={14} />{" "}
            <b>{nav.find(([id]) => id === view)?.[1]}</b>
          </span>
          <div>
            <span className={`connection ${online ? "" : "offline"}`}>
              <i />
              {online ? "En línea" : "Sin conexión"}
            </span>
            <button
              className="icon-button notification-button"
              aria-label={`Notificaciones, ${unread} sin leer`}
              onClick={() => navigate("notifications")}
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </button>
            <div className="profile-menu-wrap">
              <button
                className="profile-trigger"
                aria-label="Perfil y cierre de sesión"
                title="Perfil y cierre de sesión"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((open) => !open)}
              >
                <span className="avatar">
                  {profile.fullName.charAt(0).toUpperCase()}
                </span>
                <ChevronDown size={14} />
              </button>
              {profileMenuOpen && (
                <div className="profile-menu" role="menu" aria-label="Menú de perfil">
                  <div className="profile-menu-heading">
                    <strong>{profile.fullName}</strong>
                    <small>{profile.email}</small>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("settings");
                    }}
                  >
                    <SettingsIcon size={16} /> Mi perfil
                  </button>
                  <button
                    className="danger"
                    role="menuitem"
                    onClick={() =>
                      action(async () => {
                        await signOut(firebase().auth);
                        setEditor(undefined);
                        setSelected(null);
                        setError("");
                        setProfileMenuOpen(false);
                      })
                    }
                  >
                    <LogOut size={16} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="main-content">
          {!online && (
            <div role="status" className="alert">
              <WifiOff size={18} /> Sin conexión. Los formularios conservan el
              texto en este navegador; el envío requiere internet.
            </div>
          )}
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button aria-label="Cerrar error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {message && (
            <div role="status" className="alert success">
              {message}
              <button aria-label="Cerrar aviso" onClick={() => setMessage("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {editor !== undefined ? (
            <ActivityForm
              initial={editor || undefined}
              profile={profile}
              settings={settings}
              institutions={institutions}
              onClose={() => {
                if (
                  window.confirm(
                    "¿Salir? El texto queda guardado en este navegador; los archivos pendientes deberán seleccionarse de nuevo.",
                  )
                )
                  setEditor(undefined);
              }}
              onSaved={(a) => {
                setEditor(undefined);
                setSelected(a);
                setView("activities");
                setMessage(
                  a.status === "DRAFT"
                    ? "Borrador guardado en Firebase."
                    : editor
                      ? "Actividad actualizada correctamente."
                      : "Actividad enviada y aprobada correctamente.",
                );
              }}
            />
          ) : selected ? (
            <>
              <div className="page-heading">
                <div>
                  <button
                    className="text-button"
                    onClick={() => setSelected(null)}
                  >
                    ← Volver a actividades
                  </button>
                  <h1>Detalle de actividad</h1>
                </div>
                <div className="button-group">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => action(() => exportPdf([selected], true))}
                  >
                    <Download size={16} /> PDF
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      setEditor(selected);
                      setSelected(null);
                    }}
                  >
                    <Pencil size={16} /> Editar
                  </button>
                </div>
              </div>
              <div className="card">
                <ActivityDetail
                  activity={
                    activities.find((a) => a.id === selected.id) || selected
                  }
                />
              </div>
            </>
          ) : (
            <>
              {view === "home" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">{dateLabel}</span>
                      <h1>
                        Hola, {profile.fullName.split(" ")[0]}{" "}
                        <span className="wave">✦</span>
                      </h1>
                      <p className="muted">
                        Así se mueve la vida de nuestro teatro.
                      </p>
                    </div>
                    <button
                      className="primary"
                      onClick={() => {
                        setEditor(null);
                        setView("activities");
                      }}
                    >
                      <Plus size={18} /> Nueva actividad
                    </button>
                  </div>
                  <section className="welcome-banner">
                    <div>
                      <span className="eyebrow">
                        CULTURA · EDUCACIÓN · COMUNIDAD
                      </span>
                      <h2>
                        Un escenario para
                        <br />
                        crear y transformar.
                      </h2>
                      <p>Organiza tus actividades y acompaña su impacto.</p>
                      <button onClick={() => navigate("activities")}>
                        Explorar actividades <ArrowUpRight size={17} />
                      </button>
                    </div>
                    <div className="banner-art" aria-hidden="true">
                      <div className="arch arch-one" />
                      <div className="arch arch-two" />
                      <div className="arch arch-three" />
                      <span>✦</span>
                    </div>
                  </section>
                  <div className="stats-grid">
                    <Stat
                      title="Actividades registradas"
                      value={activities.length}
                      icon={CalendarDays}
                      note="Todas tus actividades"
                    />
                    <Stat
                      title="Participantes"
                      value={totalPeople}
                      icon={UsersRound}
                      note="En actividades enviadas"
                    />
                    <Stat
                      title="Borradores"
                      value={
                        activities.filter((a) => a.status === "DRAFT").length
                      }
                      icon={FileText}
                      note="Actividades sin enviar"
                    />
                    <Stat
                      title="Actividades aprobadas"
                      value={
                        activities.filter((a) => isApproved(a.status)).length
                      }
                      icon={CheckCircle2}
                      note="Registros validados"
                    />
                  </div>
                  <div className="dashboard-grid">
                    <section className="card">
                      <div className="row">
                        <div>
                          <h2>Actividades recientes</h2>
                          <p className="muted">
                            El trabajo que estamos construyendo.
                          </p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("activities")}
                        >
                          Ver todas <ArrowUpRight size={16} />
                        </button>
                      </div>
                      {loadingData ? (
                        <p>Cargando actividades…</p>
                      ) : activities.length ? (
                        activities
                          .slice(0, 5)
                          .map((a) => (
                            <ActivityRow
                              key={a.id}
                              activity={a}
                              onClick={() => openActivity(a)}
                            />
                          ))
                      ) : (
                        <Empty
                          title="Tu próxima actividad comienza aquí"
                          text="Registra una actividad para verla en este espacio."
                        />
                      )}
                    </section>
                    <section className="card quick-card">
                      <span className="eyebrow">A TU ALCANCE</span>
                      <h2>Todo en un lugar</h2>
                      <p className="muted">
                        Herramientas para que te concentres en lo que importa.
                      </p>
                      {[
                        [
                          FileText,
                          "Continuar un borrador",
                          "Retoma tu trabajo pendiente",
                          "activities",
                        ],
                        [
                          BarChart3,
                          "Generar un reporte",
                          "Comparte resultados e impacto",
                          "reports",
                        ],
                        [
                          Building2,
                          "Instituciones",
                          "Conecta con nuestra comunidad",
                          "institutions",
                        ],
                      ].map(([Icon, title, description, target]) => {
                        const I = Icon as typeof FileText;
                        return (
                          <button
                            key={String(title)}
                            onClick={() => {
                              navigate(target as View);
                              if (title === "Continuar un borrador")
                                setStatus("DRAFT");
                            }}
                          >
                            <I size={20} />
                            <span>
                              <strong>{String(title)}</strong>
                              <small>{String(description)}</small>
                            </span>
                            <ChevronRight size={16} />
                          </button>
                        );
                      })}
                    </section>
                  </div>
                </>
              )}
              {(view === "activities" || view === "reports") && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">REGISTRO INSTITUCIONAL</span>
                      <h1>
                        {view === "reports"
                          ? "Reportes y resultados"
                          : "Actividades"}
                      </h1>
                      <p className="muted">
                        {view === "reports"
                          ? "Filtra los registros y descarga la información que necesitas."
                          : "Consulta, registra y da seguimiento a cada actividad."}
                      </p>
                    </div>
                    {view === "activities" && (
                      <button
                        className="primary"
                        onClick={() => setEditor(null)}
                      >
                        <Plus size={18} /> Nueva actividad
                      </button>
                    )}
                  </div>
                  <div className="card">
                    <div className="filters">
                      <label className="search-field">
                        <Search size={18} />
                        <input
                          aria-label="Buscar actividades"
                          placeholder="Buscar por nombre, código o responsable…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                      <select
                        aria-label="Filtrar por estado"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="">Todos los estados</option>
                        <option value="DRAFT">Borrador</option>
                        <option value="APPROVED">Aprobado</option>
                      </select>
                      <label>
                        Desde
                        <input
                          type="date"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                        />
                      </label>
                      <label>
                        Hasta
                        <input
                          type="date"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                        />
                      </label>
                    </div>
                    {view === "reports" && (
                      <div className="report-actions">
                        <strong>
                          {filtered.length} registros ·{" "}
                          {filtered.reduce(
                            (sum, a) => sum + a.participants.totalGeneral,
                            0,
                          )}{" "}
                          participantes
                        </strong>
                        <div className="button-group">
                          <button
                            className="secondary"
                            disabled={busy || !filtered.length}
                            onClick={() => exportCsv(filtered)}
                          >
                            CSV
                          </button>
                          <button
                            className="secondary"
                            disabled={busy || !filtered.length}
                            onClick={() => action(() => exportExcel(filtered))}
                          >
                            Excel
                          </button>
                          <button
                            className="primary"
                            disabled={busy || !filtered.length}
                            onClick={() => action(() => exportPdf(filtered))}
                          >
                            <Download size={16} /> PDF
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="table-scroll">
                      <table className="activities-table">
                        <thead>
                          <tr>
                            <th>Actividad</th>
                            <th>Fecha</th>
                            <th>Participantes</th>
                            <th>Estado</th>
                            <th aria-label="Acciones" />
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((a) => (
                            <tr key={a.id}>
                              <td>
                                <button
                                  className="table-title"
                                  onClick={() => openActivity(a)}
                                >
                                  {a.nombreActividad || "Sin título"}
                                </button>
                                <small>
                                  {a.code || "Borrador"} · {a.responsibleName}
                                </small>
                              </td>
                              <td>
                                {a.fecha}
                                <small>
                                  {a.horaInicio} – {a.horaFin}
                                </small>
                              </td>
                              <td>{a.participants.totalGeneral}</td>
                              <td>
                                <span className={`badge ${a.status}`}>
                                  {statusLabels[a.status]}
                                </span>
                              </td>
                              <td>
                                <div className="button-group">
                                  <button
                                    className="icon-button"
                                    aria-label={`Ver ${a.nombreActividad}`}
                                    onClick={() => openActivity(a)}
                                  >
                                    <ArrowUpRight size={18} />
                                  </button>
                                  {(admin || a.status === "DRAFT") && (
                                    <button
                                      className="icon-button danger"
                                      aria-label={`Eliminar ${a.nombreActividad}`}
                                      disabled={busy}
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            `¿Eliminar la actividad «${a.nombreActividad}»? Esta acción no se puede deshacer.`,
                                          )
                                        )
                                          action(
                                            () =>
                                              removeRecord("activities", a.id),
                                            "Actividad eliminada.",
                                          );
                                      }}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!filtered.length && (
                      <Empty
                        title={
                          loadingData
                            ? "Cargando…"
                            : "No hay actividades para mostrar"
                        }
                        text="Los registros que coincidan con tus filtros aparecerán aquí."
                      />
                    )}
                  </div>
                </>
              )}
              {view === "institutions" && (
                <Institutions
                  institutions={institutions}
                  settings={settings}
                  admin={admin}
                  action={action}
                  busy={busy}
                />
              )}
              {view === "users" && admin && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>Usuarios</h1>
                      <p className="muted">
                        Administra los perfiles y el acceso institucional.
                      </p>
                    </div>
                  </div>
                  <div className="card table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Correo</th>
                          <th>Rol</th>
                          <th>Acceso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.uid}>
                            <td>
                              {user.fullName}
                              {user.accountDeletionRequested && (
                                <small className="danger">
                                  Solicitud de eliminación pendiente
                                </small>
                              )}
                            </td>
                            <td>{user.email}</td>
                            <td>
                              <select
                                aria-label={`Rol de ${user.fullName}`}
                                value={user.role}
                                disabled={busy || user.uid === profile.uid}
                                onChange={(e) => {
                                  const role = e.target.value;
                                  if (
                                    window.confirm(
                                      `¿Cambiar el rol de ${user.fullName} a ${role}?`,
                                    )
                                  )
                                    action(
                                      () =>
                                        patchRecord("users", user.uid, {
                                          role,
                                        }),
                                      "Rol actualizado.",
                                    );
                                }}
                              >
                                <option value="USER">Usuario</option>
                                <option value="ADMIN">Administrador</option>
                              </select>
                            </td>
                            <td>
                              <button
                                className={
                                  user.active ? "secondary" : "primary"
                                }
                                disabled={busy || user.uid === profile.uid}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `¿${user.active ? "Desactivar" : "Activar"} la cuenta de ${user.fullName}?`,
                                    )
                                  )
                                    action(
                                      () =>
                                        patchRecord("users", user.uid, {
                                          active: !user.active,
                                        }),
                                      "Acceso actualizado.",
                                    );
                                }}
                              >
                                {user.active ? "Desactivar" : "Activar"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {view === "notifications" && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>Notificaciones</h1>
                      <p className="muted">
                        Novedades y seguimiento de tus actividades.
                      </p>
                    </div>
                    <button
                      className="secondary"
                      disabled={busy || !unread}
                      onClick={() =>
                        action(() =>
                          Promise.all(
                            notices
                              .filter((n) => !n.isRead)
                              .map((n) =>
                                patchRecord("notifications", n.id, {
                                  isRead: true,
                                }),
                              ),
                          ),
                        )
                      }
                    >
                      Marcar todas como leídas
                    </button>
                  </div>
                  <div className="card">
                    {notices.length ? (
                      notices.map((n) => (
                        <div
                          className={`notice ${n.isRead ? "" : "unread"}`}
                          key={n.id}
                        >
                          <Bell size={20} />
                          <button
                            className="notice-content"
                            onClick={() =>
                              action(async () => {
                                await patchRecord("notifications", n.id, {
                                  isRead: true,
                                });
                                if (n.activityId) {
                                  const a = activities.find(
                                    (a) => a.id === n.activityId,
                                  );
                                  if (a) openActivity(a);
                                }
                              })
                            }
                          >
                            <strong>
                              {n.title === "Actividad pendiente de revisión"
                                ? "Actividad registrada"
                                : n.title}
                            </strong>
                            <p>{n.message}</p>
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Eliminar notificación"
                            onClick={() =>
                              action(() => removeRecord("notifications", n.id))
                            }
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <Empty
                        title="Estás al día"
                        text="Aquí aparecerán las novedades de tus actividades."
                      />
                    )}
                  </div>
                </>
              )}
              {view === "settings" && (
                <SettingsPanel
                  profile={profile}
                  user={authUser}
                  settings={settings}
                  admin={admin}
                  busy={busy}
                  action={action}
                />
              )}
            </>
          )}
          <footer className="page-footer">
            <span>Teatro Pablo Tesak · MINEDUCYT</span>
            <span>Un escenario de oportunidades.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Stat({
  title,
  value,
  icon: Icon,
  note,
}: {
  title: string;
  value: number;
  icon: typeof CalendarDays;
  note: string;
}) {
  return (
    <section className="stat-card">
      <div>
        <span>{title}</span>
        <Icon size={20} />
      </div>
      <strong>{value.toLocaleString("es-SV")}</strong>
      <small>{note}</small>
    </section>
  );
}
function ActivityRow({
  activity: a,
  onClick,
}: {
  activity: Activity;
  onClick: () => void;
}) {
  return (
    <button className="activity-row" onClick={onClick}>
      <div className="activity-icon">
        <CalendarDays size={20} />
      </div>
      <div>
        <strong>{a.nombreActividad || "Sin título"}</strong>
        <small>
          {a.fecha} · {a.areaIncidencia}
        </small>
      </div>
      <span className={`badge ${a.status}`}>{statusLabels[a.status]}</span>
      <ChevronRight size={16} />
    </button>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <CalendarDays size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
type Action = (fn: () => Promise<unknown>, success?: string) => Promise<void>;
function Institutions({
  institutions,
  settings,
  admin,
  action,
  busy,
}: {
  institutions: Institution[];
  settings: Settings;
  admin: boolean;
  action: Action;
  busy: boolean;
}) {
  const [editing, setEditing] = useState<Institution | null>(null);
  const [query, setQuery] = useState("");
  const [original, setOriginal] = useState("");
  if (editing) {
    return (
      <section className="institution-editor-page">
        <div className="page-heading">
          <div>
            <h1>{original ? "Editar institución" : "Nueva institución"}</h1>
            <p className="muted">Completa los datos de la institución.</p>
          </div>
          <button className="secondary" type="button" onClick={() => setEditing(null)}>
            Volver a instituciones
          </button>
        </div>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editing.name.trim() || editing.name.includes("/")) return;
            action(async () => {
              await putRecord("institutions", original || editing.name, {
                ...editing,
                name: original || editing.name,
              });
              setEditing(null);
            }, "Institución guardada.");
          }}
        >
          {original && (
            <p className="muted">El nombre identifica la institución y se conserva al editar.</p>
          )}
          <InstitutionFields
            institution={editing}
            types={settings.tiposInstitucion}
            onChange={(value) => setEditing({ ...value, name: original || value.name })}
          />
          <div className="button-group">
            <button className="primary" disabled={busy || !editing.name.trim() || editing.name.includes("/")}>
              Guardar institución
            </button>
            <button type="button" className="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
        </form>
      </section>
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Instituciones</h1>
          <p className="muted">Nuestra comunidad de aliados y participantes.</p>
        </div>
        {admin && (
          <button
            className="primary"
            onClick={() => {
              setEditing({ ...emptyInstitution });
              setOriginal("");
            }}
          >
            <Plus size={17} /> Nueva institución
          </button>
        )}
      </div>
      <div className="card">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar instituciones"
            placeholder="Buscar una institución…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="institution-grid">
          {institutions
            .filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
            .map((i) => (
              <article className="institution-card" key={i.name}>
                <Building2 size={25} />
                <h3>{i.name}</h3>
                <span className="badge">{i.type}</span>
                <p>
                  {[i.department, i.municipality, i.district]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
                <p className="muted">
                  {i.contactName} {i.contactPhone}
                </p>
                {admin && (
                  <div className="button-group">
                    <button
                      className="text-button"
                      onClick={() => {
                        setEditing({ ...emptyInstitution, ...normalizeInstitution(i) });
                        setOriginal(i.name);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="text-button danger"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`¿Eliminar ${i.name} del catálogo?`))
                          action(
                            () => removeRecord("institutions", i.name),
                            "Institución eliminada.",
                          );
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </article>
            ))}
        </div>
        {!institutions.length && (
          <Empty
            title="Sin instituciones registradas"
            text="Las instituciones de Firebase aparecerán aquí."
          />
        )}
      </div>
    </>
  );
}
function SettingsPanel({
  profile,
  user,
  settings,
  admin,
  busy,
  action,
}: {
  profile: Profile;
  user: User;
  settings: Settings;
  admin: boolean;
  busy: boolean;
  action: Action;
}) {
  const [name, setName] = useState(profile.fullName);
  async function update(e: FormEvent) {
    e.preventDefault();
    await action(async () => {
      await updateProfile(user, { displayName: name.trim() });
      await patchRecord("users", profile.uid, { fullName: name.trim() });
    }, "Perfil actualizado.");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Configuración</h1>
          <p className="muted">Tu perfil y las preferencias del sistema.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="card">
          <h2>Mi perfil</h2>
          <div className="profile-picture">
            {profile.profilePhotoUrl ? (
              <img src={profile.profilePhotoUrl} alt="Tu foto de perfil" />
            ) : (
              <div className="avatar large">{profile.fullName.charAt(0)}</div>
            )}
            <label>
              Actualizar fotografía
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  action(async () => {
                    if (
                      !file.type.startsWith("image/") ||
                      file.size > 5 * 1024 * 1024
                    )
                      throw new Error("Selecciona una imagen de hasta 5 MB.");
                    const destination = ref(
                      firebase().storage,
                      `profilePhotos/${profile.uid}/${crypto.randomUUID()}`,
                    );
                    await uploadBytes(destination, file);
                    const url = await getDownloadURL(destination);
                    await patchRecord("users", profile.uid, {
                      profilePhotoUrl: url,
                    });
                    await updateProfile(user, { photoURL: url });
                  }, "Fotografía actualizada.");
                }}
              />
            </label>
          </div>
          <form onSubmit={update}>
            <label>
              Nombre completo
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Correo electrónico
              <input value={profile.email} disabled />
            </label>
            <label>
              Rol
              <input value={admin ? "Administrador" : "Usuario"} disabled />
            </label>
            <button className="primary" disabled={busy || !name.trim()}>
              Guardar cambios
            </button>
          </form>
        </section>
        <section className="card">
          <h2>Cuenta y privacidad</h2>
          <p className="muted">
            Tu cuenta y tus actividades son compartidas con la aplicación
            Android.
          </p>
          <a className="text-button" href="/privacidad">
            Consultar privacidad y uso de datos
          </a>
          <hr />
          <h3>Solicitar eliminación de cuenta</h3>
          <p>
            Se enviará una solicitud al equipo administrador para revisar y
            procesar la eliminación de tus datos.
          </p>
          <button
            className="secondary danger"
            disabled={busy || profile.accountDeletionRequested}
            onClick={() => {
              if (
                window.confirm(
                  "¿Enviar una solicitud de eliminación de tu cuenta?",
                )
              )
                action(async () => {
                  await patchRecord("users", profile.uid, {
                    accountDeletionRequested: true,
                    accountDeletionRequestedAt: serverTimestamp(),
                  });
                }, "Solicitud registrada para revisión del administrador.");
            }}
          >
            {profile.accountDeletionRequested
              ? "Solicitud pendiente"
              : "Solicitar eliminación"}
          </button>
        </section>
      </div>
      {admin && (
        <section className="card">
          <h2>Catálogos institucionales</h2>
          <p className="muted">Estos valores se comparten con Android.</p>
          <div className="settings-grid">
            {(Object.keys(defaultSettings) as (keyof Settings)[]).map((key) => (
              <Catalog
                key={key}
                name={key}
                values={settings[key]}
                busy={busy}
                action={action}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
function Catalog({
  name,
  values,
  busy,
  action,
}: {
  name: keyof Settings;
  values: string[];
  busy: boolean;
  action: Action;
}) {
  const [value, setValue] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [draft, setDraft] = useState("");
  const labels: Record<keyof Settings, string> = {
    areasIncidencia: "Áreas de incidencia",
    tiposActividad: "Tipos de actividad",
    espacios: "Espacios",
    tiposInstitucion: "Tipos de institución",
  };
  return (
    <div className="catalog">
      <h3>{labels[name]}</h3>
      {values.map((v) => (
        <div className="row" key={v}>
          {editingValue === v ? (
            <>
              <input aria-label={`Editar ${v}`} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button
                className="icon-button"
                aria-label={`Guardar ${v}`}
                disabled={busy || !draft.trim() || (draft.trim() !== v && values.includes(draft.trim()))}
                onClick={() => action(async () => {
                  await putRecord("appData", "settings", {
                    [name]: values.map((old) => old === v ? draft.trim() : old),
                  });
                  setEditingValue("");
                  setDraft("");
                })}
              >
                <CheckCircle2 size={16} />
              </button>
              <button className="icon-button" aria-label="Cancelar edición" onClick={() => setEditingValue("")}>
                <X size={15} />
              </button>
            </>
          ) : (
            <>
              <span>{v}</span>
              <button className="icon-button" aria-label={`Editar ${v}`} disabled={busy} onClick={() => { setEditingValue(v); setDraft(v); }}>
                <Pencil size={15} />
              </button>
              <button
                className="icon-button danger"
                aria-label={`Quitar ${v}`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`¿Quitar «${v}» del catálogo compartido?`))
                    action(() =>
                      putRecord("appData", "settings", {
                        [name]: values.filter((old) => old !== v),
                      }),
                    );
                }}
              >
                <X size={15} />
              </button>
            </>
          )}
        </div>
      ))}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && !values.includes(value.trim()))
            action(async () => {
              await putRecord("appData", "settings", {
                [name]: [...values, value.trim()],
              });
              setValue("");
            });
        }}
      >
        <input
          aria-label={`Nuevo valor para ${labels[name]}`}
          placeholder="Agregar opción"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="secondary" disabled={busy || !value.trim()}>
          <Plus size={16} />
        </button>
      </form>
    </div>
  );
}
