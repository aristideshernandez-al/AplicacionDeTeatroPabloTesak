'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, Bell, Building2, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, Download, FileBarChart, LayoutDashboard, LogOut, Menu, Plus, Search, Settings, ShieldCheck, Users, X } from 'lucide-react'

type ActivityRow = { id: string; code: string | null; nombre_actividad: string; tipo_actividad: string; area_incidencia: string; fecha: string | null; responsible_name: string; status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' }

const demoActivities: ActivityRow[] = [
  { id: '1', code: 'ACT-2026-041', nombre_actividad: 'Taller de expresión artística comunitaria', tipo_actividad: 'Taller', area_incidencia: 'Formación artística', fecha: '2026-06-11', responsible_name: 'María López', status: 'APPROVED' },
  { id: '2', code: 'ACT-2026-040', nombre_actividad: 'Presentación teatral en centro educativo', tipo_actividad: 'Presentación', area_incidencia: 'Educación', fecha: '2026-06-10', responsible_name: 'Carlos Rivera', status: 'SUBMITTED' },
  { id: '3', code: 'ACT-2026-039', nombre_actividad: 'Reunión de seguimiento institucional', tipo_actividad: 'Reunión', area_incidencia: 'Gestión cultural', fecha: '2026-06-08', responsible_name: 'Ana Martínez', status: 'REJECTED' },
  { id: '4', code: 'ACT-2026-038', nombre_actividad: 'Festival artístico de la comunidad', tipo_actividad: 'Festival', area_incidencia: 'Participación comunitaria', fecha: '2026-06-05', responsible_name: 'José Hernández', status: 'APPROVED' },
]

const nav = [
  ['Resumen', LayoutDashboard], ['Actividades', ClipboardList], ['Instituciones', Building2], ['Usuarios', Users], ['Reportes', FileBarChart],
] as const

const statusLabel: Record<ActivityRow['status'], string> = { APPROVED: 'Aprobada', SUBMITTED: 'En revisión', REJECTED: 'Rechazada', DRAFT: 'Borrador', ARCHIVED: 'Archivada' }

export default function Page() {
  const supabase = useMemo(() => createClient(), [])
  const [active, setActive] = useState('Resumen')
  const [activities, setActivities] = useState<ActivityRow[]>(demoActivities)
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('Equipo de coordinación')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!alive) return
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Equipo de coordinación')
        const profile = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        setIsAdmin(profile.data?.role === 'ADMIN')
        const result = await supabase.from('activities').select('id,code,nombre_actividad,tipo_actividad,area_incidencia,fecha,responsible_name,status').order('created_at', { ascending: false }).limit(50)
        if (alive && result.data?.length) setActivities(result.data as ActivityRow[])
      }
    }
    load()
    return () => { alive = false }
  }, [supabase])

  async function createActivity() {
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const optimistic: ActivityRow = { id: crypto.randomUUID(), code: 'NUEVA', nombre_actividad: name.trim(), tipo_actividad: 'Actividad', area_incidencia: 'Pendiente de clasificar', fecha: new Date().toISOString().slice(0, 10), responsible_name: userName, status: 'DRAFT' }
    if (user) {
      const result = await supabase.from('activities').insert({ responsible_id: user.id, responsible_name: userName, nombre_actividad: name.trim(), status: 'DRAFT' }).select('id,code,nombre_actividad,tipo_actividad,area_incidencia,fecha,responsible_name,status').single()
      setActivities((current) => [result.data ? result.data as ActivityRow : optimistic, ...current])
    } else setActivities((current) => [optimistic, ...current])
    setName(''); setShowForm(false); setSaving(false)
  }

  const visible = activities.filter((item) => `${item.nombre_actividad} ${item.code} ${item.responsible_name}`.toLowerCase().includes(query.toLowerCase()))
  const approved = activities.filter((item) => item.status === 'APPROVED').length
  const pending = activities.filter((item) => item.status === 'SUBMITTED').length

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Activity size={18} /></span><span>Control de Actividades</span></div>
      <div className="workspace"><div className="avatar"><ShieldCheck size={16} /></div><div><strong>Teatro Pablo Tesak</strong><span>Gestión institucional</span></div><ChevronDown size={15} /></div>
      <nav aria-label="Navegación principal"><p className="nav-label">MÓDULOS</p>{nav.map(([label, Icon]) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => setActive(label)}><Icon size={18} />{label}{label === 'Actividades' && <span className="nav-count">{activities.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Settings size={18} />Configuración</button><div className="help-card"><strong>Centro de ayuda</strong><p>Administra el registro y seguimiento de tus actividades.</p><button>Ver documentación</button></div><div className="profile-row"><div className="avatar small">{userName.charAt(0).toUpperCase()}</div><div><strong>{userName}</strong><span>{isAdmin ? 'Administrador' : 'Colaborador'}</span></div><button className="icon-button" aria-label="Cerrar sesión"><LogOut size={16} /></button></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><button className="mobile-menu" aria-label="Abrir menú"><Menu size={20} /></button><div className="breadcrumbs"><span>Teatro Pablo Tesak</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Buscar"><Search size={18} /></button><button className="icon-button notification" aria-label="Notificaciones"><Bell size={18} /><i /></button><div className="avatar small">{userName.charAt(0).toUpperCase()}</div></div></header>
      <div className="page-wrap">
        <div className="welcome-row"><div><p className="eyebrow">SISTEMA DE CONTROL Y SEGUIMIENTO</p><h1>{active === 'Resumen' ? 'Resumen general' : active}</h1><p className="subtitle">Registra, organiza y da seguimiento a las actividades del Teatro Pablo Tesak.</p></div><button className="primary-button" onClick={() => setShowForm(true)}><Plus size={18} />Nueva actividad</button></div>
        {showForm && <div className="form-card"><div><strong>Registrar actividad</strong><span>Comienza con el nombre de la actividad. Podrás completar el formulario después.</span></div><input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) createActivity() }} placeholder="Nombre de la actividad" /><button onClick={createActivity} disabled={saving}>{saving ? 'Guardando...' : 'Guardar borrador'}</button><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Cerrar"><X size={18} /></button></div>}
        <div className="stats-grid"><div className="stat-card accent"><span className="stat-icon"><ClipboardList size={17} /></span><div><p>Actividades registradas</p><strong>{activities.length}</strong></div><span className="stat-note">Este periodo</span></div><div className="stat-card"><span className="stat-icon violet"><CheckCircle2 size={17} /></span><div><p>Actividades aprobadas</p><strong>{approved}</strong></div><span className="stat-note up">Seguimiento al día</span></div><div className="stat-card"><span className="stat-icon orange"><CalendarDays size={17} /></span><div><p>Pendientes de revisión</p><strong>{pending}</strong></div><span className="stat-note">Requieren atención</span></div></div>
        <div className="dashboard-grid"><section className="panel activities-panel"><div className="panel-heading"><div><h2>Actividades recientes</h2><p>Consulta y seguimiento de registros institucionales</p></div><button className="text-button" onClick={() => setActive('Actividades')}>Ver todas <span>→</span></button></div><div className="toolbar"><div className="search-box"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar actividad, código o responsable" /></div><button className="filter-button">Todos los estados <ChevronDown size={14} /></button></div><div className="activity-list">{visible.map((item) => <article className="activity-row" key={item.id}><div className="activity-icon"><ClipboardList size={17} /></div><div className="activity-info"><strong>{item.nombre_actividad}</strong><span>{item.code || 'Sin código'} <b>·</b> {item.tipo_actividad || 'Sin tipo'} <b>·</b> {item.fecha || 'Sin fecha'}</span></div><div className="activity-owner">{item.responsible_name || 'Sin responsable'}</div><span className={`status ${item.status.toLowerCase()}`}>{statusLabel[item.status]}</span></article>)}</div><button className="add-inline" onClick={() => setShowForm(true)}><Plus size={17} />Registrar otra actividad</button></section><aside className="right-column"><section className="panel overview-card"><div className="panel-heading"><div><h2>Estado del sistema</h2><p>Resumen de gestión</p></div><Activity size={20} className="teal-icon" /></div><div className="donut"><div><strong>{activities.length ? Math.round((approved / activities.length) * 100) : 0}%</strong><span>completado</span></div></div><div className="legend"><span><i className="dot approved" />Aprobadas <b>{approved}</b></span><span><i className="dot pending" />En revisión <b>{pending}</b></span><span><i className="dot other" />Otros estados <b>{activities.length - approved - pending}</b></span></div></section><section className="panel quick-card"><h2>Accesos rápidos</h2><button onClick={() => setActive('Instituciones')}><Building2 size={17} />Gestionar instituciones <span>→</span></button><button onClick={() => setActive('Reportes')}><Download size={17} />Exportar reporte mensual <span>→</span></button><button onClick={() => setActive('Usuarios')}><Users size={17} />Administrar usuarios <span>→</span></button></section></aside></div>
      </div>
    </section>
  </main>
}
