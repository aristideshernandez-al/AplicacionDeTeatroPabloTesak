'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Bell, Building2, CalendarDays, CheckCircle2, ChevronDown,
  ClipboardList, FileBarChart, House, Menu, Plus, Search,
  Settings, ShieldCheck, Theater, Users, X, Clock3, MapPin, ArrowRight,
  UserRound, CircleHelp, Send, ListChecks,
} from 'lucide-react'
import { AuthGate, useAuthSession } from '@/components/auth-gate'
import { getFirebase } from '@/lib/firebase/client'
import { createClient as createSupabaseClient, supabaseConfigured } from '@/lib/supabase/client'
import type { LucideIcon } from 'lucide-react'

type Status = 'DRAFT' | 'SUBMITTED' | 'ENVIADO' | 'EVIADO' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'
type ActivityRow = {
  id: string
  code: string
  nombreActividad: string
  tipoActividad: string
  areaIncidencia: string
  fecha: string
  responsibleName: string
  horaInicio: string
  horaFin: string
  status: Status
}
type InstitutionRow = { id: string; name: string; department: string; municipality: string; type: string }
type ProfileRow = { id: string; fullName: string | null; email: string; role: string; active: boolean }

const nav: readonly (readonly [string, LucideIcon])[] = [
  ['Resumen', House],
  ['Actividades', ClipboardList],
  ['Instituciones', Building2],
  ['Reportes', FileBarChart],
  ['Ajustes', Settings],
] as const
const labels: Record<Status, string> = {
  APPROVED: 'Aprobada', SUBMITTED: 'En revisión', ENVIADO: 'En revisión', EVIADO: 'En revisión', REJECTED: 'Rechazada',
  DRAFT: 'Borrador', ARCHIVED: 'Archivada',
}

function parseDate(value: string | null) {
  if (!value) return null
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const local = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (local) return new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]))
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value: string | null) {
  const date = parseDate(value)
  return date ? new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric' }).format(date) : 'Fecha pendiente'
}

export default function Page() {
  return <AuthGate><Dashboard /></AuthGate>
}

function Dashboard() {
  const { user, profile, signOutUser } = useAuthSession()
  const supabase = useMemo(() => supabaseConfigured ? createSupabaseClient(async () => {
    const currentUser = getFirebase().auth.currentUser
    return currentUser ? currentUser.getIdToken() : null
  }) : null, [])
  const [active, setActive] = useState('Resumen')
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'Taller', area: 'Formación artística', date: '', startTime: '', endTime: '', background: '', objective: '', description: '', evaluation: '' })
  const [mobileOpen, setMobileOpen] = useState(false)
  const userName = profile.fullName || user.displayName || user.email?.split('@')[0] || 'Colaborador'
  const isAdmin = profile.role === 'ADMIN'

  useEffect(() => {
    let alive = true
    if (!supabase) {
      setDataError('Falta configurar Supabase. Agrega la URL y la clave pública del proyecto en .env.local.')
      setLoading(false)
      return () => { alive = false }
    }
    ;(async () => {
      try {
        const activityQuery = supabase.from('activities')
          .select('id,code,nombre_actividad,tipo_actividad,area_incidencia,fecha,responsible_name,status')
          .order('created_at', { ascending: false })
          .limit(100)
        const [activitySnapshot, institutionSnapshot, profileSnapshot] = await Promise.all([
          activityQuery,
          supabase.from('activity_institutions').select('id,name,department,type').order('name'),
          isAdmin ? supabase.from('profiles').select('id,full_name,role,active').order('full_name') : Promise.resolve({ data: [], error: null }),
        ])
        const requestError = activitySnapshot.error || institutionSnapshot.error || profileSnapshot.error
        if (requestError) throw requestError
        if (!alive) return
        const activityRows: ActivityRow[] = (activitySnapshot.data || []).map((item) => ({
          id: item.id, code: item.code || '', nombreActividad: item.nombre_actividad || '',
          tipoActividad: item.tipo_actividad || '', areaIncidencia: item.area_incidencia || '',
          fecha: item.fecha || '', responsibleName: item.responsible_name || '', horaInicio: '', horaFin: '',
          status: (item.status || 'DRAFT') as Status,
        }))
        setActivities(activityRows)
        setInstitutions((institutionSnapshot.data || []).map((item) => ({ id: item.id, name: item.name || '', department: item.department || '', municipality: '', type: item.type || '' })))
        setProfiles((profileSnapshot.data || []).map((item) => ({ id: item.id, fullName: item.full_name || null, email: '', role: item.role || 'USER', active: item.active !== false })))
        setDataError('')
      } catch (cause) {
        if (!alive) return
        const code = typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : ''
        const detail = cause instanceof Error
          ? cause.message
          : typeof cause === 'object' && cause && 'message' in cause
            ? String(cause.message)
            : ''
        if (code === '42501' || code === 'PGRST301' || code === '401') {
          setDataError('Supabase rechazó la consulta por permisos. Revisa la conexión de Firebase como proveedor externo y las políticas de acceso de las tablas.')
        } else if (code === '42P01' || code.startsWith('PGRST')) {
          setDataError(`No se encontró una tabla o columna esperada en Supabase. ${detail}`)
        } else {
          setDataError(`No se pudieron cargar los datos de Supabase. ${detail || 'Revisa la conexión y la configuración del proyecto.'}`)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [supabase, isAdmin, user.uid])

  async function saveActivity() {
    if (!form.name.trim()) return
    if (!supabase) throw new Error('Supabase no está configurado.')
    const date = parseDate(form.date)
    const dateValue = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null
    const { error } = await supabase.from('activities').insert({
      responsible_id: user.uid, responsible_name: userName,
      area_incidencia: form.area, tipo_actividad: form.type,
      nombre_actividad: form.name.trim(), fecha: dateValue, status: 'DRAFT',
    })
    if (error) throw error
    setActivities((current) => [{
      id: crypto.randomUUID(), code: '', nombreActividad: form.name.trim(),
      tipoActividad: form.type, areaIncidencia: form.area,
      fecha: dateValue || '', responsibleName: userName, horaInicio: form.startTime,
      horaFin: form.endTime, status: 'DRAFT',
    }, ...current])
    setForm({ name: '', type: 'Taller', area: 'Formación artística', date: '', startTime: '', endTime: '', background: '', objective: '', description: '', evaluation: '' })
    setShowForm(false)
  }

  const visible = activities.filter((item) =>
    `${item.nombreActividad} ${item.code || ''} ${item.responsibleName}`.toLowerCase().includes(query.toLowerCase()),
  )
  const approved = activities.filter((item) => item.status === 'APPROVED').length
  const pending = activities.filter((item) => ['SUBMITTED', 'ENVIADO', 'EVIADO'].includes(item.status)).length
  const drafts = activities.filter((item) => item.status === 'DRAFT').length
  const thisMonth = activities.filter((item) => {
    const date = parseDate(item.fecha)
    const now = new Date()
    return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length
  const pageNav: readonly (readonly [string, LucideIcon])[] = isAdmin ? [...nav.slice(0, 3), ['Usuarios', Users], nav[3], nav[4]] : nav
  const bottomNav: readonly (readonly [string, LucideIcon])[] = isAdmin
    ? [...nav.slice(0, 3), ['Usuarios', Users], nav[4]]
    : [nav[0], nav[1], nav[3], nav[2], nav[4]]

  function navigate(label: string) {
    setActive(label)
    setMobileOpen(false)
  }

  return <main className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Theater size={19} /></span><span>Teatro Pablo Tesak</span></div>
      <div className="workspace"><div className="avatar"><ShieldCheck size={16} /></div><div><strong>Teatro Pablo Tesak</strong><span>Gestión de actividades</span></div><ChevronDown size={15} /></div>
      <nav aria-label="Navegación principal"><p className="nav-label">MENÚ PRINCIPAL</p>{pageNav.map(([label, Icon]) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => navigate(label)}><Icon size={18} />{label}{label === 'Actividades' && <span className="nav-count">{activities.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="help-card"><CircleHelp size={18} /><div><strong>¿Necesitas ayuda?</strong><p>Consulta el registro y seguimiento de actividades.</p></div><button aria-label="Ver ayuda"><ArrowRight size={15} /></button></div>
        <div className="profile-row"><div className="avatar small">{userName[0]?.toUpperCase()}</div><div><strong>{userName}</strong><span>{isAdmin ? 'Administrador' : 'Colaborador'}</span></div><Settings size={16} /></div>
      </div>
    </aside>

    <section className="content">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Abrir menú"><Menu size={21} /></button>
        <div className="breadcrumbs"><span>Teatro Pablo Tesak</span><span>/</span><strong>{active}</strong></div>
        <div className="top-actions"><button className="icon-button" aria-label="Buscar" onClick={() => { navigate('Actividades'); document.getElementById('activity-search')?.focus() }}><Search size={19} /></button><button className="icon-button notification" aria-label="Notificaciones"><Bell size={19} /><i /></button><div className="avatar small">{userName[0]?.toUpperCase()}</div></div>
      </header>

      <div className="page-wrap">
        {active === 'Resumen' ? <>
          <section className="home-greeting">
            <div><p className="eyebrow">{(() => { const value = new Intl.DateTimeFormat('es-SV', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()); return value.charAt(0).toLocaleUpperCase('es-SV') + value.slice(1) })()}</p><h1>¡Hola, {userName.split(' ')[0]}!</h1><p className="subtitle">Aquí tienes el resumen de tus actividades.</p></div>
            <button className="primary-button greeting-action" onClick={() => setShowForm(true)}><Plus size={18} />Registrar actividad</button>
          </section>
          <section className="quick-section">
            <SectionHeading icon={<Activity size={18} />} title="Accesos rápidos" />
            <div className="quick-actions">
              <QuickAction icon={<Plus size={22} />} title="Registrar" text="Nueva actividad" onClick={() => setShowForm(true)} />
              <QuickAction icon={<FileBarChart size={22} />} title="Reportes" text="Ver resultados" onClick={() => navigate('Reportes')} />
              <QuickAction icon={<Building2 size={22} />} title="Instituciones" text="Espacios aliados" onClick={() => navigate('Instituciones')} />
              <QuickAction icon={<Search size={22} />} title="Consultar" text="Buscar registros" onClick={() => navigate('Actividades')} />
            </div>
          </section>
          <section className="home-stats">
            <MetricCard icon={<CalendarDays size={18} />} label="Actividades este mes" value={thisMonth} tone="purple" onClick={() => navigate('Actividades')} />
            <MetricCard icon={<Clock3 size={18} />} label="En revisión" value={pending} tone="amber" onClick={() => navigate('Actividades')} />
            <MetricCard icon={<CheckCircle2 size={18} />} label="Aprobadas" value={approved} tone="green" onClick={() => navigate('Actividades')} />
          </section>
          <section className="impact-card">
            <div className="impact-heading"><div><SectionHeading icon={<ListChecks size={18} />} title="Estado de gestión" /><p>Seguimiento de los registros en el sistema</p></div><button className="text-button" onClick={() => navigate('Actividades')}>Ver actividades <ArrowRight size={15} /></button></div>
            <div className="status-bar" aria-label={`${approved} aprobadas, ${pending} en revisión y ${drafts} borradores`}>{activities.length ? <><span className="bar-approved" style={{ flex: approved || 0.01 }} /><span className="bar-pending" style={{ flex: pending || 0.01 }} /><span className="bar-draft" style={{ flex: drafts || 0.01 }} /><span className="bar-other" style={{ flex: Math.max(activities.length - approved - pending - drafts, 0.01) }} /></> : <span className="bar-other" style={{ flex: 1 }} />}</div>
            <div className="impact-legend"><span><i className="dot approved" />Aprobadas <b>{approved}</b></span><span><i className="dot pending" />En revisión <b>{pending}</b></span><span><i className="dot draft" />Borradores <b>{drafts}</b></span></div>
          </section>
          <section className="recent-section">
            <div className="section-title-row"><SectionHeading icon={<ClipboardList size={18} />} title="Actividad reciente" /><button className="text-button" onClick={() => navigate('Actividades')}>Ver todas <ArrowRight size={15} /></button></div>
            {loading ? <div className="loading-bar" role="status">Cargando actividades…</div> : <ActivityList items={visible.slice(0, 5)} />}
            {!loading && visible.length === 0 && <EmptyState text="Aún no hay actividades registradas." />}
          </section>
        </> : <>
          <div className="page-heading"><div><p className="eyebrow">TEATRO PABLO TESAK</p><h1>{active}</h1><p className="subtitle">{pageSubtitle(active)}</p></div>{active === 'Actividades' && <button className="primary-button" onClick={() => setShowForm(true)}><Plus size={18} />Registrar actividad</button>}</div>
          {loading && <div className="loading-bar" role="status">Cargando información…</div>}
          {active === 'Actividades' && <ActivityPage activities={visible} query={query} setQuery={setQuery} />}
          {active === 'Instituciones' && <DirectoryPage type="institutions" institutions={institutions} />}
          {active === 'Usuarios' && <DirectoryPage type="users" profiles={profiles} isAdmin={isAdmin} />}
          {active === 'Reportes' && <ReportsPage activities={activities} />}
          {active === 'Ajustes' && <SettingsPage userName={userName} email={user.email || ''} isAdmin={isAdmin} onSignOut={signOutUser} />}
        </>}
        {dataError && <div className="auth-message error" role="alert">{dataError}</div>}
        {showForm && <ActivityForm form={form} setForm={setForm} onClose={() => setShowForm(false)} onSave={saveActivity} />}
      </div>
    </section>

    <nav className="mobile-nav" aria-label="Navegación inferior">{bottomNav.map(([label, Icon]) => <button key={label} className={active === label ? 'selected' : ''} onClick={() => navigate(label)}><Icon size={20} /><span>{label}</span></button>)}</nav>
    {mobileOpen && <button className="scrim" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
  </main>
}

function pageSubtitle(page: string) {
  if (page === 'Actividades') return 'Consulta y organiza los registros de tu equipo.'
  if (page === 'Instituciones') return 'Espacios e instituciones vinculados al programa.'
  if (page === 'Usuarios') return 'Perfiles y permisos del sistema.'
  if (page === 'Ajustes') return 'Información de tu perfil y de la aplicación.'
  return 'Información para el seguimiento y la toma de decisiones.'
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="section-heading"><span>{icon}</span><h2>{title}</h2></div>
}

function QuickAction({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return <button className="quick-action" onClick={onClick}><span className="quick-icon">{icon}</span><strong>{title}</strong><small>{text}</small></button>
}

function MetricCard({ icon, label, value, tone, onClick }: { icon: React.ReactNode; label: string; value: number; tone: string; onClick: () => void }) {
  return <button className={`metric-card ${tone}`} onClick={onClick}><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span><strong>{value}</strong></button>
}

function ActivityList({ items }: { items: ActivityRow[] }) {
  return <div className="activity-list">{items.map((item) => <article className="activity-row" key={item.id}>
    <div className="activity-icon"><ClipboardList size={18} /></div><div className="activity-info"><strong>{item.nombreActividad || 'Actividad sin nombre'}</strong><span>{item.code || 'Sin código'} <b>·</b> {item.tipoActividad || 'Sin tipo'} <b>·</b> {formatDate(item.fecha)}</span></div><div className="activity-owner">{item.responsibleName}</div><span className={`status ${item.status.toLowerCase()}`}>{labels[item.status] || item.status}</span>
  </article>)}</div>
}

type ActivityFormValues = { name: string; type: string; area: string; date: string; startTime: string; endTime: string; background: string; objective: string; description: string; evaluation: string }

function ActivityForm({ form, setForm, onClose, onSave }: { form: ActivityFormValues; setForm: (value: ActivityFormValues) => void; onClose: () => void; onSave: () => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submitActivity() {
    setSaving(true)
    setError('')
    try {
      await onSave()
    } catch (cause) {
      const code = typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : ''
      setError(code.includes('permission-denied')
        ? 'No tienes permiso para guardar la actividad. Verifica que tu cuenta esté activa.'
        : 'No se pudo guardar el borrador. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="form-card" role="dialog" aria-modal="true" aria-labelledby="form-title">
    <div className="form-heading"><div><span className="form-kicker">NUEVO REGISTRO</span><strong id="form-title">Registrar actividad</strong><span>Guarda un borrador y completa los detalles cuando quieras.</span></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div>
    <div className="form-grid"><label>Nombre de la actividad<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Taller de teatro comunitario" /></label><label>Tipo de actividad<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Taller</option><option>Presentación</option><option>Reunión</option><option>Festival</option><option>Capacitación</option></select></label><label>Área de incidencia<select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}><option>Formación artística</option><option>Educación</option><option>Gestión cultural</option><option>Participación comunitaria</option></select></label><label>Fecha<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Hora de inicio<input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label><label>Hora de finalización<input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label><label className="form-wide">Antecedentes<textarea value={form.background} onChange={(event) => setForm({ ...form, background: event.target.value })} rows={2} /></label><label className="form-wide">Objetivo<textarea value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} rows={2} /></label><label className="form-wide">Descripción<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label><label className="form-wide">Evaluación y seguimiento<textarea value={form.evaluation} onChange={(event) => setForm({ ...form, evaluation: event.target.value })} rows={2} /></label></div>
    {error && <div className="auth-message error" role="alert">{error}</div>}
    <div className="form-actions"><button className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button><button className="primary-button" onClick={() => void submitActivity()} disabled={!form.name.trim() || saving}>{saving ? 'Guardando…' : <><Send size={16} />Guardar borrador</>}</button></div>
  </section></div>
}

function ActivityPage({ activities, query, setQuery }: { activities: ActivityRow[]; query: string; setQuery: (value: string) => void }) {
  const [status, setStatus] = useState('Todos los estados')
  const filtered = activities.filter((item) => status === 'Todos los estados' || labels[item.status] === status)
  return <section className="panel page-panel"><div className="toolbar"><div className="search-box"><Search size={17} /><input id="activity-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar actividad, código o responsable" /></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos los estados</option><option>Aprobada</option><option>En revisión</option><option>Borrador</option><option>Rechazada</option><option>Archivada</option></select></div>
    {filtered.length ? <ActivityList items={filtered} /> : <EmptyState text="No encontramos actividades con esos criterios." />}
  </section>
}

function DirectoryPage({ type, institutions = [], profiles = [], isAdmin = false }: { type: 'institutions' | 'users'; institutions?: InstitutionRow[]; profiles?: ProfileRow[]; isAdmin?: boolean }) {
  const institution = type === 'institutions'
  const empty = institution ? 'No hay instituciones registradas.' : isAdmin ? 'No hay usuarios registrados.' : 'El listado de usuarios está disponible para administradores.'
  return <section className="panel page-panel"><div className="directory-list">{institution ? institutions.map((row) => <div className="directory-row" key={row.id}><div className="directory-icon"><Building2 size={19} /></div><div><strong>{row.name}</strong><span><MapPin size={13} />{row.department || 'Departamento no indicado'}</span></div><span className="directory-tag">{row.type}</span></div>) : profiles.map((row) => <div className="directory-row" key={row.id}><div className="directory-icon"><UserRound size={19} /></div><div><strong>{row.fullName || 'Usuario sin nombre'}</strong><span>{row.email} · {row.role}</span></div><span className={`directory-tag ${row.active ? '' : 'inactive'}`}>{row.active ? 'Activo' : 'Inactivo'}</span></div>)}{((institution && institutions.length === 0) || (!institution && profiles.length === 0)) && <EmptyState text={empty} />}</div></section>
}

function ReportsPage({ activities }: { activities: ActivityRow[] }) {
  const downloadCsv = () => {
    const rows = [['Código', 'Actividad', 'Tipo', 'Área', 'Fecha', 'Responsable', 'Estado'], ...activities.map((item) => [item.code || '', item.nombreActividad, item.tipoActividad, item.areaIncidencia, item.fecha || '', item.responsibleName, labels[item.status] || item.status])]
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = 'reporte-actividades.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return <section className="report-grid"><ReportCard icon={<FileBarChart size={24} />} title="Reporte de actividades" text="Descarga los registros con fecha, área y estado." action="Descargar CSV" onClick={downloadCsv} /><ReportCard icon={<Users size={24} />} title="Participación comunitaria" text="Consulta los registros vinculados a instituciones y comunidades." action="Ver instituciones" /><ReportCard icon={<CalendarDays size={24} />} title="Calendario institucional" text={`${activities.length} actividades disponibles para planificación.`} action="Consultar actividades" /></section>
}

function SettingsPage({ userName, email, isAdmin, onSignOut }: { userName: string; email: string; isAdmin: boolean; onSignOut: () => Promise<void> }) {
  return <section className="settings-panel panel">
    <div className="settings-profile"><div className="avatar">{userName[0]?.toUpperCase()}</div><div><strong>{userName}</strong><span>{email}</span><span>{isAdmin ? 'Administrador' : 'Colaborador'}</span></div></div>
    <div className="settings-group"><h2>Aplicación</h2><div className="settings-row"><div><strong>Teatro Pablo Tesak</strong><span>Sistema de control y seguimiento de actividades</span></div><Theater size={20} /></div></div>
    <div className="settings-group"><h2>Preferencias</h2><div className="settings-row"><div><strong>Idioma</strong><span>Español</span></div><span className="directory-tag">Predeterminado</span></div></div>
    <div className="settings-group"><h2>Cuenta</h2><button className="secondary-button" onClick={() => void onSignOut()}>Cerrar sesión</button></div>
  </section>
}

function ReportCard({ icon, title, text, action, onClick }: { icon: React.ReactNode; title: string; text: string; action: string; onClick?: () => void }) {
  return <article className="report-card"><span className="report-icon">{icon}</span><h2>{title}</h2><p>{text}</p><button className="secondary-button" onClick={onClick}>{action}<ArrowRight size={15} /></button></article>
}

function EmptyState({ text }: { text: string }) { return <div className="empty-state"><span><ClipboardList size={22} /></span><p>{text}</p></div> }
