'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity as ActivityIcon, ArrowLeft, Building2, ChevronDown, ClipboardList, FileBarChart, LayoutDashboard, LogOut, Menu, Save, Settings, ShieldCheck, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Status = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'
type Institution = { id: string; name: string; type: string; department: string; municipality: string; district: string; infrastructure_code: string; contact_name: string; contact_phone: string }
const normalizeInstitutionName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')

const empty = { name: '', type: 'Taller', otherType: '', area: 'Formación artística', date: '', startTime: '', endTime: '', background: '', objective: '', description: '', followUp: '', spaces: [] as string[], otherSpace: '', institutionIds: [] as string[], institutions: [] as Institution[], teachers: 0, studentsF: 0, studentsM: 0, community: 0, artists: 0, technicalName: '', technicalRole: '', methodology: '', technicalNotes: '', status: 'DRAFT' as Status }

export function ActivityFormPage({ activityId }: { activityId?: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [form, setForm] = useState(empty)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [userName, setUserName] = useState('Colaborador')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [recordLoading, setRecordLoading] = useState(Boolean(activityId))
  const [recordError, setRecordError] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const editing = Boolean(activityId)

  useEffect(() => { let alive = true; (async () => { const [{ data: catalog }, { data: { user } }] = await Promise.all([supabase.from('activity_institutions').select('id,name,type,department,municipality,district,infrastructure_code,contact_name,contact_phone').order('name'), supabase.auth.getUser()]); if (!alive) return; if (catalog) setInstitutions(catalog as Institution[]); if (user) setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Colaborador') })(); return () => { alive = false } }, [supabase])
  useEffect(() => {
    if (!activityId) {
      setRecordLoading(false)
      return
    }

    let alive = true
    setRecordLoading(true)
    setRecordError('')

    async function loadActivity() {
      const [{ data, error }, { data: catalog, error: catalogError }] = await Promise.all([
        supabase.from('activities').select('*').eq('id', activityId).maybeSingle(),
        supabase.from('activity_institutions').select('id,name,type,department,municipality,district,infrastructure_code,contact_name,contact_phone').order('name'),
      ])

      if (!alive) return
      if (error || !data) {
        setRecordError(error?.message || 'No encontramos la actividad que quieres editar.')
        setRecordLoading(false)
        return
      }

      const hasSavedInstitutions = Array.isArray(data.institutions) ? data.institutions.length > 0 : Boolean(data.institutions)
      if (catalogError && hasSavedInstitutions) {
        setRecordError(catalogError.message)
        setRecordLoading(false)
        return
      }

      const availableInstitutions = (catalog || []) as Institution[]
      setInstitutions(availableInstitutions)
      const participants = data.participants || {}
      const technical = data.technical_info || {}
      const savedInstitutions = Array.isArray(data.institutions)
        ? data.institutions as Array<Institution | string>
        : typeof data.institutions === 'string'
          ? [data.institutions]
          : []
      const selectedInstitutions = savedInstitutions
        .map((saved) => {
          const savedId = typeof saved === 'string' ? '' : saved.id
          const savedName = typeof saved === 'string' ? saved : saved.name || (saved as Institution & { nombre?: string }).nombre
          const normalizedName = savedName ? normalizeInstitutionName(savedName) : ''
          return availableInstitutions.find((institution) => institution.id === savedId || institution.id === savedName)
            || availableInstitutions.find((institution) => normalizeInstitutionName(institution.name) === normalizedName)
        })
        .filter((institution): institution is Institution => Boolean(institution))

      setForm({
        ...empty,
        name: data.nombre_actividad || '',
        type: data.tipo_actividad || 'Taller',
        otherType: data.otro_tipo_actividad || '',
        area: data.area_incidencia || 'Formación artística',
        date: data.fecha || '',
        startTime: data.hora_inicio || '',
        endTime: data.hora_fin || '',
        background: data.antecedentes || '',
        objective: data.objetivo || '',
        description: data.descripcion || '',
        followUp: data.evaluacion_seguimiento || '',
        spaces: data.selected_spaces || [],
        otherSpace: data.other_space || '',
        institutionIds: selectedInstitutions.map((institution) => institution.id),
        institutions: selectedInstitutions,
        teachers: participants.teachers || 0,
        studentsF: participants.studentsF || 0,
        studentsM: participants.studentsM || 0,
        community: participants.community || 0,
        artists: participants.artists || 0,
        technicalName: technical.responsibleName || '',
        technicalRole: technical.responsibleRole || '',
        methodology: technical.methodology || '',
        technicalNotes: technical.technicalNotes || '',
        status: data.status || 'DRAFT',
      })
      setRecordLoading(false)
    }

    void loadActivity().catch(() => {
      if (!alive) return
      setRecordError('No pudimos consultar los datos de la actividad.')
      setRecordLoading(false)
    })
    return () => { alive = false }
  }, [activityId, supabase])
  function update(key: string, value: any) { setForm((current) => ({ ...current, [key]: value })) }
  async function save() { if (!form.name.trim()) { setMessage('El nombre de la actividad es obligatorio.'); return } setSaving(true); setMessage(''); const { data: { user } } = await supabase.auth.getUser(); if (!user) { setMessage('Debes iniciar sesión para guardar.'); setSaving(false); return } const participants = { teachers: form.teachers, studentsF: form.studentsF, studentsM: form.studentsM, community: form.community, artists: form.artists, totalGeneral: form.teachers + form.studentsF + form.studentsM + form.community + form.artists }; const payload = { responsible_id: user.id, responsible_name: userName, nombre_actividad: form.name.trim(), tipo_actividad: form.type, otro_tipo_actividad: form.otherType, area_incidencia: form.area, fecha: form.date || null, hora_inicio: form.startTime || null, hora_fin: form.endTime || null, antecedentes: form.background, objetivo: form.objective, descripcion: form.description, evaluacion_seguimiento: form.followUp, selected_spaces: form.spaces, other_space: form.otherSpace, institutions: form.institutions.filter((institution) => form.institutionIds.includes(institution.id)), participants, technical_info: { responsibleName: form.technicalName, responsibleRole: form.technicalRole, methodology: form.methodology, technicalNotes: form.technicalNotes }, status: form.status }; const result = editing ? await supabase.from('activities').update(payload).eq('id', activityId) : await supabase.from('activities').insert(payload); setSaving(false); if (result.error) { setMessage(result.error.message); return } window.location.href = '/?section=Actividades' }
  const selectedInstitutions = institutions.filter((institution) => form.institutionIds.includes(institution.id))
  return <main className="app-shell">
    {recordLoading && <div role="status" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', background: '#f4f7f7', color: '#19333b', fontWeight: 700 }}>Cargando los datos guardados…</div>}
    {recordError && <div role="alertdialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 24, background: '#f4f7f7', color: '#19333b', textAlign: 'center' }}><div><h2>No se pudo cargar la actividad</h2><p>Regresa a la lista e inténtalo nuevamente. No guardaremos cambios en blanco.</p><button className="primary-button" onClick={() => { window.location.href = '/?section=Actividades' }}>Volver a actividades</button></div></div>}
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><img className="brand-logo" src="/logo-teatro-pablo-tesak.png" alt="Logotipo Teatro Pablo Tesak" /><span>Gestión de actividades</span></div>
      <div className="workspace"><div className="avatar"><ShieldCheck size={16} /></div><div><strong>Teatro Pablo Tesak</strong><span>Gestión institucional</span></div><ChevronDown size={15} /></div>
      <nav><p className="nav-label">MÓDULOS</p>{[['Resumen', LayoutDashboard], ['Actividades', ClipboardList], ['Instituciones', Building2], ['Usuarios', Users], ['Reportes', FileBarChart]].map(([label, Icon]: any) => <button key={label} className={`nav-item ${label === 'Actividades' ? 'active' : ''}`} onClick={() => { window.location.href = `/?section=${encodeURIComponent(label)}` }}><Icon size={18} />{label}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Settings size={18} />Configuración</button><div className="help-card"><strong>Centro de ayuda</strong><p>Administra el registro y seguimiento de tus actividades.</p><button>Ver documentación</button></div><button className="nav-item" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth/login' }}><LogOut size={18} />Cerrar sesión</button><div className="profile-row"><div className="avatar small">{userName[0]?.toUpperCase()}</div><div><strong>{userName}</strong><span>Colaborador</span></div></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Abrir menú"><Menu size={20} /></button><div className="breadcrumbs"><span>Teatro Pablo Tesak</span><span>/</span><strong>Actividades</strong></div><div className="top-actions"><div className="avatar small">{userName[0]?.toUpperCase()}</div></div></header>
      <div className="standalone-page"><header className="standalone-header"><button className="text-button" onClick={() => window.location.href = '/?section=Actividades'}><ArrowLeft size={15} /> Volver a actividades</button><div><p className="eyebrow">TEATRO PABLO TESAK</p><h1>{editing ? 'Editar actividad' : 'Agregar actividad'}</h1><p className="subtitle">Completa la información institucional en una página dedicada.</p></div><button className="primary-button" onClick={save} disabled={saving}><Save size={16} />{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar actividad'}</button></header><section className="standalone-card"><div className="section-intro"><span>Formulario completo</span><small>Los campos se almacenan en Supabase y permanecen disponibles para el equipo.</small></div><div className="form-grid standalone-form"><label>Nombre de la actividad<input autoFocus value={form.name} onChange={(e) => update('name', e.target.value)} /></label><label>Área de incidencia<select value={form.area} onChange={(e) => update('area', e.target.value)}><option>Formación artística</option><option>Educación</option><option>Gestión cultural</option><option>Participación comunitaria</option></select></label><label>Tipo de actividad<select value={form.type} onChange={(e) => update('type', e.target.value)}><option>Taller</option><option>Presentación</option><option>Reunión</option><option>Festival</option><option>Capacitación</option><option>Otro</option></select></label>{form.type === 'Otro' && <label>Otro tipo<input value={form.otherType} onChange={(e) => update('otherType', e.target.value)} /></label>}<label>Fecha<input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} /></label><label>Hora de inicio<input type="time" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} /></label><label>Hora de finalización<input type="time" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} /></label><label className="form-wide institution-picker"><span>Instituciones participantes</span><small>Selecciona una o varias del catálogo de Supabase.</small><select multiple value={form.institutionIds} onChange={(e) => { const ids = Array.from(e.target.selectedOptions, (option) => option.value); update('institutionIds', ids); update('institutions', institutions.filter((institution) => ids.includes(institution.id))) }} aria-label="Instituciones participantes">{institutions.map((institution) => <option key={institution.id} value={institution.id}>{institution.name} · {institution.department || 'Sin departamento'}</option>)}</select>{institutions.length === 0 && <em>No hay instituciones registradas.</em>}<div className="selected-institutions">{selectedInstitutions.map((institution) => <span key={institution.id}>{institution.name}</span>)}</div></label><label className="form-wide">Espacios donde se realiza<select multiple value={form.spaces} onChange={(e) => update('spaces', Array.from(e.target.selectedOptions, (option) => option.value))}><option>Centro educativo</option><option>Casa de la Cultura</option><option>Espacio comunitario</option><option>Teatro Pablo Tesak</option><option>Otro</option></select></label>{form.spaces.includes('Otro') && <label className="form-wide">Otro espacio<input value={form.otherSpace} onChange={(e) => update('otherSpace', e.target.value)} /></label>}<label>Docentes<input type="number" min="0" value={form.teachers} onChange={(e) => update('teachers', Number(e.target.value))} /></label><label>Estudiantes mujeres<input type="number" min="0" value={form.studentsF} onChange={(e) => update('studentsF', Number(e.target.value))} /></label><label>Estudiantes hombres<input type="number" min="0" value={form.studentsM} onChange={(e) => update('studentsM', Number(e.target.value))} /></label><label>Comunidad<input type="number" min="0" value={form.community} onChange={(e) => update('community', Number(e.target.value))} /></label><label>Artistas<input type="number" min="0" value={form.artists} onChange={(e) => update('artists', Number(e.target.value))} /></label><label className="form-wide">Antecedentes<textarea value={form.background} onChange={(e) => update('background', e.target.value)} rows={3} /></label><label className="form-wide">Objetivo<textarea value={form.objective} onChange={(e) => update('objective', e.target.value)} rows={3} /></label><label className="form-wide">Descripción<textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} /></label><label className="form-wide">Evaluación y seguimiento<textarea value={form.followUp} onChange={(e) => update('followUp', e.target.value)} rows={3} /></label><label>Responsable técnico<input value={form.technicalName} onChange={(e) => update('technicalName', e.target.value)} /></label><label>Cargo del responsable<input value={form.technicalRole} onChange={(e) => update('technicalRole', e.target.value)} /></label><label className="form-wide">Metodología<textarea value={form.methodology} onChange={(e) => update('methodology', e.target.value)} rows={3} /></label><label className="form-wide">Notas técnicas<textarea value={form.technicalNotes} onChange={(e) => update('technicalNotes', e.target.value)} rows={3} /></label><label>Estado<select value={form.status} onChange={(e) => update('status', e.target.value as Status)}><option value="DRAFT">Borrador</option><option value="SUBMITTED">Enviar a revisión</option></select></label></div>{message && <p className="form-message">{message}</p>}</section></div>
    </section>
  </main>
}
