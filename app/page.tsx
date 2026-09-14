'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CalendarDays, Check, ChevronDown, Circle, Clock3, Folder, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings, Sparkles, Target, X } from 'lucide-react'

type Task = { id: string; title: string; status: 'todo' | 'in_progress' | 'done'; priority: 'low' | 'medium' | 'high'; due_date?: string | null; category_id?: string | null }

const demoTasks: Task[] = [
  { id: '1', title: 'Revisar propuesta de diseño', status: 'in_progress', priority: 'high', due_date: 'Hoy', category_id: 'Trabajo' },
  { id: '2', title: 'Preparar presentación del lunes', status: 'todo', priority: 'medium', due_date: 'Mañana', category_id: 'Trabajo' },
  { id: '3', title: 'Comprar ingredientes para la cena', status: 'todo', priority: 'low', due_date: 'Vie, 12 jun', category_id: 'Personal' },
  { id: '4', title: 'Caminar 30 minutos', status: 'done', priority: 'medium', due_date: 'Hoy', category_id: 'Salud' },
]

const navItems = [
  { label: 'Resumen', icon: LayoutDashboard },
  { label: 'Tareas', icon: Check },
  { label: 'Calendario', icon: CalendarDays },
  { label: 'Notas', icon: Folder },
  { label: 'Hábitos', icon: Target },
]

export default function Page() {
  const supabase = useMemo(() => createClient(), [])
  const [activeNav, setActiveNav] = useState('Resumen')
  const [tasks, setTasks] = useState<Task[]>(demoTasks)
  const [userName, setUserName] = useState('Alex')
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted || !user) return
      setUserName(user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Alex')
      const { data } = await supabase.from('tasks').select('id,title,status,priority,due_date,category_id').order('created_at', { ascending: false }).limit(20)
      if (mounted && data?.length) setTasks(data as Task[])
    }
    load()
    return () => { mounted = false }
  }, [supabase])

  async function addTask() {
    if (!newTask.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const optimistic: Task = { id: crypto.randomUUID(), title: newTask.trim(), status: 'todo', priority: 'medium', due_date: 'Hoy', category_id: 'Personal' }
    if (user) {
      const { data } = await supabase.from('tasks').insert({ user_id: user.id, title: newTask.trim(), status: 'todo', priority: 'medium' }).select('id,title,status,priority,due_date,category_id').single()
      if (data) setTasks((current) => [data as Task, ...current])
    } else setTasks((current) => [optimistic, ...current])
    setNewTask(''); setShowAdd(false); setSaving(false)
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: task.status === 'done' ? 'todo' : 'done' } : task))
  }

  const completed = tasks.filter((task) => task.status === 'done').length
  const visibleTasks = activeNav === 'Tareas' ? tasks : tasks.slice(0, 4)

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>Clarity</span></div>
        <div className="workspace"><div className="avatar">A</div><div><strong>{userName}&apos;s space</strong><span>Espacio personal</span></div><ChevronDown size={15} /></div>
        <nav aria-label="Navegación principal"><p className="nav-label">ESPACIO DE TRABAJO</p>{navItems.map(({ label, icon: Icon }) => <button className={`nav-item ${activeNav === label ? 'active' : ''}`} key={label} onClick={() => setActiveNav(label)}><Icon size={18} strokeWidth={1.8} />{label}{label === 'Tareas' && <span className="nav-count">{tasks.filter(t => t.status !== 'done').length}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><button className="nav-item"><Settings size={18} />Configuración</button><div className="upgrade"><div className="upgrade-icon"><Sparkles size={16} /></div><strong>Desbloquea tu foco</strong><p>Organiza mejor tus días con Clarity Pro.</p><button>Ver planes</button></div><div className="profile-row"><div className="avatar small">A</div><div><strong>{userName}</strong><span>Plan gratuito</span></div><button aria-label="Cerrar sesión" className="icon-button"><LogOut size={16} /></button></div></div>
      </aside>
      <section className="content">
        <header className="topbar"><button className="mobile-menu" aria-label="Abrir menú"><Menu size={20} /></button><div className="breadcrumbs"><span>Espacio personal</span><span>/</span><strong>{activeNav}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Buscar"><Search size={18} /></button><button className="icon-button notification" aria-label="Notificaciones"><Bell size={18} /><i /></button><div className="avatar small">A</div></div></header>
        <div className="page-wrap">
          <div className="welcome-row"><div><p className="eyebrow">JUEVES, 11 DE JUNIO DE 2026</p><h1>Buenos días, {userName}.</h1><p className="subtitle">Un día claro empieza con una mente clara.</p></div><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={18} />Nueva tarea</button></div>
          {showAdd && <div className="add-task"><input autoFocus value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) addTask() }} placeholder="¿Qué necesitas hacer?" /><button onClick={addTask} disabled={saving}>{saving ? 'Guardando...' : 'Añadir'}</button><button className="icon-button" onClick={() => setShowAdd(false)} aria-label="Cerrar"><X size={18} /></button></div>}
          <div className="stats-grid"><div className="stat-card accent"><span className="stat-icon"><Check size={17} /></span><div><p>Tareas completadas</p><strong>{completed} <small>de {tasks.length}</small></strong></div><div className="progress"><span style={{ width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%` }} /></div></div><div className="stat-card"><span className="stat-icon violet"><Target size={17} /></span><div><p>Racha actual</p><strong>7 <small>días</small></strong></div><span className="stat-note up">+2 esta semana</span></div><div className="stat-card"><span className="stat-icon orange"><Clock3 size={17} /></span><div><p>Tiempo enfocado</p><strong>3h 24m</strong></div><span className="stat-note">Esta semana</span></div></div>
          <div className="dashboard-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><h2>{activeNav === 'Tareas' ? 'Todas tus tareas' : 'Tareas de hoy'}</h2><p>{completed} completadas · {tasks.filter(t => t.status !== 'done').length} pendientes</p></div><button className="text-button" onClick={() => setActiveNav('Tareas')}>Ver todas <span>→</span></button></div><div className="task-list">{visibleTasks.map((task) => <div className={`task-row ${task.status === 'done' ? 'is-done' : ''}`} key={task.id}><button className={`task-check ${task.status === 'done' ? 'checked' : ''}`} onClick={() => toggleTask(task.id)} aria-label={`Marcar ${task.title}`}>{task.status === 'done' && <Check size={13} />}</button><div className="task-info"><strong>{task.title}</strong><span><i className={`priority ${task.priority}`} />{task.category_id || 'Personal'} <b>·</b> {task.due_date || 'Sin fecha'}</span></div><button className="icon-button task-more" aria-label="Más opciones"><MoreHorizontal size={18} /></button></div>)}</div><button className="add-inline" onClick={() => setShowAdd(true)}><Plus size={17} />Añadir una tarea</button></section><aside className="right-column"><section className="panel focus-card"><div className="focus-glow" /><div className="panel-heading"><div><h2>Tu foco de hoy</h2><p>Pequeños pasos, grandes avances.</p></div><Sparkles size={20} className="sparkle" /></div><div className="focus-ring"><div><strong>{tasks.filter(t => t.status === 'done').length}/{tasks.length}</strong><span>completadas</span></div></div><p className="focus-message">Vas por buen camino. Mantén el impulso.</p><button className="secondary-button">Iniciar sesión de foco <span>→</span></button></section><section className="panel habits-card"><div className="panel-heading"><div><h2>Hábitos</h2><p>Tu progreso esta semana</p></div><button className="icon-button"><MoreHorizontal size={18} /></button></div><div className="habit"><span className="habit-dot teal" /><div><strong>Leer 20 minutos</strong><span>5 de 7 días</span></div><div className="week-dots">{[1,1,1,1,1,0,0].map((done, i) => <i className={done ? 'done' : ''} key={i}>{done ? <Check size={9} /> : ''}</i>)}</div></div><div className="habit"><span className="habit-dot purple" /><div><strong>Meditar</strong><span>3 de 7 días</span></div><div className="week-dots">{[1,1,0,1,0,0,0].map((done, i) => <i className={done ? 'done' : ''} key={i}>{done ? <Check size={9} /> : ''}</i>)}</div></div></section></aside></div>
        </div>
      </section>
    </main>
  )
}
