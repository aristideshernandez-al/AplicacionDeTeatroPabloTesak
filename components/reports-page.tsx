'use client'

import { useMemo, useState } from 'react'
import { BarChart3, Building2, CalendarDays, CheckCircle2, Clock3, Download, Eye, FileBarChart, FileText, Filter, Image as ImageIcon, List, MapPin, Palette, Printer, RotateCcw, Users, X } from 'lucide-react'

type Scope = 'INDIVIDUAL' | 'GENERAL_PERIODIC' | 'BY_INSTITUTION' | 'STUDENT_GENDER' | 'BY_SPACE' | 'STATISTICAL'
type Period = 'ACTIVITY' | 'MONTHLY' | 'SPECIFIC_MONTH' | 'SPECIFIC_DATE' | 'TRIMESTRE' | 'SEMESTER' | 'ANNUAL' | 'ALL'
type Presentation = 'EXECUTIVE_SUMMARY' | 'TECHNICAL_REPORT' | 'INSTITUTIONAL_REPORT' | 'ACTIVITY_MEMORY' | 'STATISTICAL_REPORT'
type FrameStyle = 'CREATIVE' | 'CLASSIC' | 'ROUNDED' | 'POLAROID' | 'MINIMAL' | 'TAPE'
type AttendancePage = { activity: string; pageNumber: number; dataUrl: string }
type ParticipantCounts = { teachers?: number; studentsF?: number; studentsM?: number; community?: number; artists?: number; totalGeneral?: number }
type ReportActivity = {
  id: string; code?: string | null; nombre_actividad: string; tipo_actividad: string; otro_tipo_actividad?: string | null; area_incidencia?: string | null; fecha?: string | null; hora_inicio?: string | null; hora_fin?: string | null; responsible_name?: string | null; responsible_id?: string | null; antecedentes?: string | null; objetivo?: string | null; descripcion?: string | null; evaluacion_seguimiento?: string | null; admin_observation?: string | null; status: string; selected_spaces?: string[]; other_space?: string | null; institutions?: { name: string; type?: string; department?: string; municipality?: string; district?: string }[]; participants?: ParticipantCounts; technical_info?: { responsibleName?: string; responsibleRole?: string; methodology?: string; technicalNotes?: string; observations?: string }; photo_urls?: string[]; attendance_list_urls?: string[]; other_annex_urls?: string[]
}

const scopeOptions: { id: Scope; title: string; description: string; icon: typeof FileBarChart }[] = [
  { id: 'INDIVIDUAL', title: 'Individual', description: 'Una actividad', icon: FileText },
  { id: 'GENERAL_PERIODIC', title: 'General', description: 'Resumen del periodo', icon: FileBarChart },
  { id: 'BY_INSTITUTION', title: 'Por institución', description: 'Gestión por entidad', icon: Building2 },
  { id: 'STUDENT_GENDER', title: 'Participantes', description: 'Alumnado y público', icon: Users },
  { id: 'BY_SPACE', title: 'Por espacio', description: 'Uso de áreas', icon: MapPin },
  { id: 'STATISTICAL', title: 'Estadístico', description: 'Indicadores clave', icon: BarChart3 },
]
const periodOptions: { id: Period; label: string }[] = [
  { id: 'ACTIVITY', label: 'Por actividad' }, { id: 'MONTHLY', label: 'Mes actual' }, { id: 'SPECIFIC_MONTH', label: 'Mes específico' }, { id: 'SPECIFIC_DATE', label: 'Fecha específica' }, { id: 'TRIMESTRE', label: 'Trimestral' }, { id: 'SEMESTER', label: 'Semestral' }, { id: 'ANNUAL', label: 'Anual' }, { id: 'ALL', label: 'Todo' },
]
const presentationOptions: { id: Presentation; label: string; description: string }[] = [
  { id: 'EXECUTIVE_SUMMARY', label: 'Resumen ejecutivo', description: 'Resultados principales para decisiones administrativas.' },
  { id: 'TECHNICAL_REPORT', label: 'Informe técnico', description: 'Información operativa, espacios, responsables y evidencias.' },
  { id: 'INSTITUTIONAL_REPORT', label: 'Informe institucional', description: 'Actividades y participación agrupadas por institución.' },
  { id: 'ACTIVITY_MEMORY', label: 'Memoria de actividades', description: 'Acciones, participantes, evidencias y resultados.' },
  { id: 'STATISTICAL_REPORT', label: 'Reporte estadístico', description: 'Indicadores, participación y uso del teatro.' },
]
const frameOptions: { id: FrameStyle; label: string }[] = [
  { id: 'CREATIVE', label: 'Creativo' }, { id: 'CLASSIC', label: 'Clásico' }, { id: 'ROUNDED', label: 'Redondeado' }, { id: 'POLAROID', label: 'Polaroid' }, { id: 'MINIMAL', label: 'Minimalista' }, { id: 'TAPE', label: 'Cinta' },
]
const reportColors = [{ name: 'Institucional', value: '#6650A4' }, { name: 'Morado claro', value: '#8E63C8' }, { name: 'Verde', value: '#2E7D32' }, { name: 'Azul', value: '#1F4E79' }, { name: 'Rojo vino', value: '#7B1E3A' }, { name: 'Grafito', value: '#455A64' }]
const frameColors = [{ name: 'Institucional', value: '#6650A4' }, { name: 'Blanco', value: '#FFFFFF' }, { name: 'Morado claro', value: '#8E63C8' }, { name: 'Verde', value: '#2E7D32' }, { name: 'Dorado', value: '#D4AF37' }, { name: 'Grafito', value: '#455A64' }]
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const allLabel = 'Todos'
const statusLabels: Record<string, string> = { APPROVED: 'Realizada', SUBMITTED: 'Programada', DRAFT: 'Programada', REJECTED: 'Cancelada', ARCHIVED: 'Cancelada', ENVIADO: 'Programada', EVIADO: 'Programada' }
const statusDetails: Record<string, string> = { APPROVED: 'Aprobada', SUBMITTED: 'En revisión', DRAFT: 'Borrador', REJECTED: 'Rechazada', ARCHIVED: 'Archivada', ENVIADO: 'En revisión', EVIADO: 'En revisión' }
const emptyOptions = { includePhotos: true, includeSignatures: true, includeAnnexes: true, includeObservations: true, includeStats: true, includeParticipants: true }

export function ReportsPage({ activities }: { activities: ReportActivity[] }) {
  const [scope, setScope] = useState<Scope>('GENERAL_PERIODIC')
  const [presentation, setPresentation] = useState<Presentation>('EXECUTIVE_SUMMARY')
  const [period, setPeriod] = useState<Period>('MONTHLY')
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [specificMonth, setSpecificMonth] = useState(-1)
  const [specificYear, setSpecificYear] = useState(new Date().getFullYear())
  const [specificDate, setSpecificDate] = useState('')
  const [filters, setFilters] = useState({ space: allLabel, institution: allLabel, responsible: allLabel, activityType: allLabel, status: allLabel, registeredBy: allLabel })
  const [options, setOptions] = useState(emptyOptions)
  const [reportColor, setReportColor] = useState('#6650A4')
  const [headerTextColor, setHeaderTextColor] = useState('#FFFFFF')
  const [frameColor, setFrameColor] = useState('#6650A4')
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('CREATIVE')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [attendancePages, setAttendancePages] = useState<AttendancePage[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')

  const choices = useMemo(() => ({
    spaces: distinct(activities.flatMap((activity) => [...(activity.selected_spaces || []), activity.other_space || ''])),
    institutions: distinct(activities.flatMap((activity) => (activity.institutions || []).map((institution) => institution.name))),
    responsibles: distinct(activities.map((activity) => activity.responsible_name || '')),
    activityTypes: distinct(activities.map((activity) => activity.tipo_actividad || activity.otro_tipo_actividad || '')),
    statuses: distinct(activities.map((activity) => statusLabels[activity.status] || activity.status)),
    registeredBy: distinct(activities.map((activity) => activity.responsible_name || activity.responsible_id || '')),
  }), [activities])

  const filtered = useMemo(() => activities.filter((activity) => {
    const date = parseDate(activity.fecha)
    const now = new Date()
    const matchesPeriod = (() => {
      if (period === 'ALL' || period === 'ACTIVITY') return true
      if (!date) return false
      if (period === 'MONTHLY') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      if (period === 'SPECIFIC_MONTH') return (specificMonth < 0 || date.getMonth() === specificMonth) && (!specificYear || date.getFullYear() === specificYear)
      if (period === 'SPECIFIC_DATE') return Boolean(specificDate) && toIsoDate(date) === specificDate
      if (period === 'TRIMESTRE') return Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3) && date.getFullYear() === now.getFullYear()
      if (period === 'SEMESTER') return (date.getMonth() < 6) === (now.getMonth() < 6) && date.getFullYear() === now.getFullYear()
      return period === 'ANNUAL' && date.getFullYear() === now.getFullYear()
    })()
    const spaces = [...(activity.selected_spaces || []), activity.other_space || '']
    return matchesPeriod && matchesChoice(filters.space, spaces) && matchesChoice(filters.institution, (activity.institutions || []).map((item) => item.name)) && matchesChoice(filters.responsible, [activity.responsible_name || '']) && matchesChoice(filters.activityType, [activity.tipo_actividad || activity.otro_tipo_actividad || '']) && matchesChoice(filters.status, [statusLabels[activity.status] || activity.status]) && matchesChoice(filters.registeredBy, [activity.responsible_name || activity.responsible_id || ''])
  }).sort((a, b) => (parseDate(a.fecha)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (parseDate(b.fecha)?.getTime() ?? Number.MAX_SAFE_INTEGER) || a.nombre_actividad.localeCompare(b.nombre_actividad, 'es')), [activities, period, specificMonth, specificYear, specificDate, filters])
  const reportActivities = scope === 'INDIVIDUAL' ? filtered.filter((activity) => activity.id === selectedActivityId) : filtered
  const stats = useMemo(() => calculateStats(reportActivities), [reportActivities])
  const canGenerate = reportActivities.length > 0 && (scope !== 'INDIVIDUAL' || Boolean(selectedActivityId))
  const config = { scope, presentation, period, options, reportColor, headerTextColor, frameColor, frameStyle, specificMonth, specificYear, specificDate, filters }
  const presentationInfo = presentationOptions.find((item) => item.id === presentation)!

  function chooseScope(nextScope: Scope) {
    setScope(nextScope)
    setSelectedActivityId('')
    if (nextScope === 'INDIVIDUAL') setPeriod('ACTIVITY')
    else if (period === 'ACTIVITY') setPeriod('MONTHLY')
    if (nextScope === 'STATISTICAL') setPresentation('STATISTICAL_REPORT')
    if (nextScope === 'BY_INSTITUTION') setPresentation('INSTITUTIONAL_REPORT')
    if (nextScope === 'BY_SPACE') setPresentation('TECHNICAL_REPORT')
  }

  async function openPrintView() {
    if (!canGenerate) return
    setPreviewOpen(true)
    setAttendancePages([])
    setAttendanceError('')
    const attachments = options.includeSignatures
      ? reportActivities.flatMap((activity) => (activity.attendance_list_urls || []).filter((url) => safeUrl(url)).map((url) => ({ url, activity: activity.nombre_actividad })))
      : []
    if (!attachments.length) return
    setLoadingAttendance(true)
    try {
      const renderedPages: AttendancePage[] = []
      for (const attachment of attachments) {
        renderedPages.push(...await renderAttendanceAttachment(attachment.url, attachment.activity, renderedPages.length))
      }
      setAttendancePages(renderedPages)
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : 'No se pudieron preparar las listas de asistencia.')
    } finally {
      setLoadingAttendance(false)
    }
  }

  function printReport() {
    const reportFrame = document.querySelector<HTMLIFrameElement>('.report-preview-window iframe')
    if (!reportFrame?.contentWindow) return
    reportFrame.contentWindow.focus()
    reportFrame.contentWindow.print()
  }

  function downloadCsv() {
    const headers = ['Código', 'Fecha', 'Actividad', 'Tipo', 'Estado', 'Responsable', 'Instituciones', 'Espacios', 'Docentes', 'Estudiantes mujeres', 'Estudiantes hombres', 'Comunidad', 'Artistas', 'Participantes', 'Horas']
    const rows = reportActivities.map((activity) => [activity.code || '', formatDate(activity.fecha), activity.nombre_actividad, activity.tipo_actividad || activity.otro_tipo_actividad || '', statusDetails[activity.status] || activity.status, activity.responsible_name || '', (activity.institutions || []).map((item) => item.name).join('; '), [...(activity.selected_spaces || []), activity.other_space || ''].filter(Boolean).join('; '), count(activity.participants?.teachers), count(activity.participants?.studentsF), count(activity.participants?.studentsM), count(activity.participants?.community), count(activity.participants?.artists), count(activity.participants?.totalGeneral), formatNumber(calculateHours(activity.hora_inicio, activity.hora_fin))])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `Reporte_TPT_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
  }

  return <section className="panel page-panel reports-page">
    <div className="reports-intro"><div><p className="eyebrow">INFORMES INSTITUCIONALES</p><h2>Reportes y seguimiento</h2><p>Configura el informe, revisa la selección y genera una copia lista para guardar como PDF.</p></div><div className="reports-total"><FileBarChart size={20} /><span><strong>{filtered.length}</strong> actividades coinciden</span></div></div>
    <div className="reports-layout">
      <div className="reports-controls">
        <section className="report-config-card"><div className="report-section-title"><FileBarChart size={17} /><h3>Tipo de reporte</h3></div><div className="report-scope-grid">{scopeOptions.map(({ id, title, description, icon: Icon }) => <button key={id} className={`report-scope-option ${scope === id ? 'selected' : ''}`} onClick={() => chooseScope(id)} aria-pressed={scope === id}><Icon size={19} /><strong>{title}</strong><small>{description}</small></button>)}</div></section>
        <section className="report-config-card report-config-grid"><div className="report-section-title"><CalendarDays size={17} /><h3>Presentación y periodo</h3></div><label className="report-field">Formato narrativo<select value={presentation} onChange={(event) => setPresentation(event.target.value as Presentation)}>{presentationOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><small>{presentationInfo.description}</small></label><div className="report-periods">{periodOptions.filter((item) => scope === 'INDIVIDUAL' || item.id !== 'ACTIVITY').map((item) => <button className={period === item.id ? 'selected' : ''} key={item.id} onClick={() => setPeriod(item.id)}>{item.label}</button>)}</div>
          {period === 'SPECIFIC_MONTH' && <div className="report-inline-fields"><label className="report-field">Mes<select value={specificMonth} onChange={(event) => setSpecificMonth(Number(event.target.value))}><option value={-1}>Todos</option>{monthNames.map((month, index) => <option value={index} key={month}>{month}</option>)}</select></label><label className="report-field">Año<input type="number" min="2000" max="2100" value={specificYear} onChange={(event) => setSpecificYear(Number(event.target.value))} /></label></div>}
          {period === 'SPECIFIC_DATE' && <label className="report-field">Fecha específica<input type="date" value={specificDate} onChange={(event) => setSpecificDate(event.target.value)} /></label>}
          {scope === 'INDIVIDUAL' && <label className="report-field">Actividad<select value={selectedActivityId} onChange={(event) => setSelectedActivityId(event.target.value)}><option value="">Selecciona una actividad</option>{filtered.map((activity) => <option key={activity.id} value={activity.id}>{formatDate(activity.fecha)} · {activity.nombre_actividad}</option>)}</select></label>}
        </section>
        <details className="report-config-card report-details"><summary><Filter size={17} /><span><strong>Filtros avanzados</strong><small>Espacio, institución, responsable, tipo y estado</small></span></summary><div className="report-filters-grid"><ReportSelect label="Espacio del teatro" value={filters.space} values={choices.spaces} onChange={(value) => setFilters({ ...filters, space: value })} /><ReportSelect label="Institución" value={filters.institution} values={choices.institutions} onChange={(value) => setFilters({ ...filters, institution: value })} /><ReportSelect label="Responsable" value={filters.responsible} values={choices.responsibles} onChange={(value) => setFilters({ ...filters, responsible: value })} /><ReportSelect label="Tipo de actividad" value={filters.activityType} values={choices.activityTypes} onChange={(value) => setFilters({ ...filters, activityType: value })} /><ReportSelect label="Estado" value={filters.status} values={choices.statuses} onChange={(value) => setFilters({ ...filters, status: value })} /><ReportSelect label="Usuario que registró" value={filters.registeredBy} values={choices.registeredBy} onChange={(value) => setFilters({ ...filters, registeredBy: value })} /></div><button className="report-reset" onClick={() => setFilters({ space: allLabel, institution: allLabel, responsible: allLabel, activityType: allLabel, status: allLabel, registeredBy: allLabel })}><RotateCcw size={14} />Limpiar filtros</button></details>
        <details className="report-config-card report-details"><summary><List size={17} /><span><strong>Opciones del reporte</strong><small>Elige qué incluir en el documento</small></span></summary><div className="report-options-grid">{([['includePhotos', 'Incluir fotografías', ImageIcon], ['includeSignatures', 'Incluir listas de asistencia', FileText], ['includeAnnexes', 'Incluir documentos anexos', FileText], ['includeObservations', 'Incluir observaciones', FileText], ['includeStats', 'Incluir estadísticas', BarChart3], ['includeParticipants', 'Incluir participantes', Users]] as const).map(([key, label, Icon]) => <label className="report-option" key={key}><input type="checkbox" checked={options[key]} onChange={(event) => setOptions({ ...options, [key]: event.target.checked })} /><Icon size={16} /><span>{label}</span></label>)}</div></details>
        <details className="report-config-card report-details"><summary><Palette size={17} /><span><strong>Diseño del reporte</strong><small>Ajusta los colores institucionales y las evidencias</small></span></summary><div className="report-style-grid"><ColorField label="Fondo del encabezado" value={reportColor} presets={reportColors} onChange={setReportColor} /><ColorField label="Texto y logo del encabezado" value={headerTextColor} presets={[{ name: 'Blanco', value: '#FFFFFF' }, { name: 'Negro', value: '#1A1A1A' }, { name: 'Dorado', value: '#D4AF37' }]} onChange={setHeaderTextColor} /><ColorField label="Marco de evidencias" value={frameColor} presets={frameColors} onChange={setFrameColor} /><label className="report-field">Estilo de marco<select value={frameStyle} onChange={(event) => setFrameStyle(event.target.value as FrameStyle)}>{frameOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div></details>
      </div>
      <aside className="reports-summary">
        <section className="report-config-card report-stats-card"><div className="report-section-title"><BarChart3 size={17} /><h3>Estadísticas automáticas</h3></div><div className="report-stats-grid"><StatPill label="Actividades" value={stats.activities} /><StatPill label="Instituciones" value={stats.institutions} /><StatPill label="Participantes" value={stats.participants} /><StatPill label="Horas de uso" value={formatNumber(stats.hours)} /><StatPill label="Espacio más usado" value={stats.topSpace} /><StatPill label="Institución con mayor participación" value={stats.topInstitution} /></div></section>
        <section className="report-config-card report-activities-card"><div className="report-section-title"><CheckCircle2 size={17} /><h3>{scope === 'INDIVIDUAL' ? 'Selecciona una actividad' : `Actividades incluidas (${reportActivities.length})`}</h3></div>{filtered.length === 0 ? <p className="report-empty">No hay actividades que coincidan con estos filtros.</p> : <div className="report-activity-list">{(scope === 'INDIVIDUAL' ? filtered : reportActivities).slice(0, scope === 'INDIVIDUAL' ? 30 : 8).map((activity) => <button key={activity.id} className={`report-activity-row ${selectedActivityId === activity.id ? 'selected' : ''}`} onClick={() => scope === 'INDIVIDUAL' && setSelectedActivityId(activity.id)} disabled={scope !== 'INDIVIDUAL'}><span className="report-activity-check">{scope === 'INDIVIDUAL' && selectedActivityId === activity.id ? <CheckCircle2 size={17} /> : <Clock3 size={16} />}</span><span className="report-activity-copy"><strong>{activity.nombre_actividad || 'Actividad sin nombre'}</strong><small>{formatDate(activity.fecha)} · {activity.tipo_actividad || activity.otro_tipo_actividad || 'Sin tipo'} · {statusDetails[activity.status] || activity.status}</small><small>{(activity.institutions || []).map((item) => item.name).join(', ') || 'Sin institución'} · {[...(activity.selected_spaces || []), activity.other_space || ''].filter(Boolean).join(', ') || 'Sin espacio'}</small></span></button>)}</div>}{scope !== 'INDIVIDUAL' && reportActivities.length > 8 && <p className="report-list-note">Y {reportActivities.length - 8} actividades más en el documento.</p>}</section>
        <div className="report-actions"><button className="secondary-button" disabled={!canGenerate} onClick={() => setPreviewOpen(true)}><Eye size={16} />Vista previa</button><button className="primary-button" disabled={!canGenerate} onClick={openPrintView}><Printer size={16} />Generar PDF</button><button className="secondary-button" disabled={!canGenerate} onClick={downloadCsv}><Download size={16} />Descargar CSV</button></div><p className="report-print-note">En el cuadro de impresión, selecciona «Guardar como PDF» para descargar el informe.</p>
      </aside>
    </div>
    {previewOpen && <div className="report-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa del informe"><div className="report-preview-window"><header><div><strong>Vista previa del PDF</strong><span>{reportActivities.length} actividades · {presentationInfo.label}</span></div><div><button className="primary-button" disabled={!canGenerate || loadingAttendance || Boolean(attendanceError)} onClick={printReport}><Printer size={16} />Imprimir / guardar PDF</button><button className="icon-button" onClick={() => setPreviewOpen(false)} aria-label="Cerrar vista previa"><X size={19} /></button></div></header>{loadingAttendance && <p className="report-attachment-status" role="status">Cargando e incorporando las páginas de asistencia…</p>}{attendanceError && <p className="report-attachment-error" role="alert">{attendanceError} Cierra esta vista y desmarca «Incluir listas de asistencia» para continuar sin esos documentos.</p>}<iframe title="Vista previa del informe" srcDoc={buildReportHtml(config, reportActivities, stats, typeof window === 'undefined' ? '' : window.location.origin, attendancePages)} /></div></div>}
  </section>
}

async function renderAttendanceAttachment(url: string, activity: string, alreadyRendered: number): Promise<AttendancePage[]> {
  const response = await fetch(`/api/reportes/adjunto?url=${encodeURIComponent(url)}`, { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || 'No se pudo descargar la lista de asistencia.')
  }
  const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase()
  const bytes = await response.arrayBuffer()

  if (contentType.startsWith('image/')) {
    const bitmap = await createImageBitmap(new Blob([bytes], { type: contentType }))
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return [{ activity, pageNumber: 1, dataUrl: canvas.toDataURL('image/jpeg', 0.9) }]
  }

  if (contentType !== 'application/pdf') throw new Error('La lista debe ser un PDF o una imagen JPG, PNG o WebP.')
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
  const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise
  if (alreadyRendered + pdfDocument.numPages > 30) {
    await pdfDocument.destroy()
    throw new Error('El conjunto de listas supera el límite de 30 páginas por informe.')
  }

  const result: AttendancePage[] = []
  for (let index = 1; index <= pdfDocument.numPages; index += 1) {
    const page = await pdfDocument.getPage(index)
    const viewport = page.getViewport({ scale: 1.45 })
    const canvas = globalThis.document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('El navegador no pudo preparar la imagen del documento de asistencia.')
    await page.render({ canvasContext: context, viewport }).promise
    result.push({ activity, pageNumber: index, dataUrl: canvas.toDataURL('image/jpeg', 0.9) })
    page.cleanup()
  }
  await pdfDocument.destroy()
  return result
}

function ReportSelect({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) { return <label className="report-field">{label}<select value={value} onChange={(event) => onChange(event.target.value)}><option>{allLabel}</option>{values.map((item) => <option key={item}>{item}</option>)}</select></label> }
function ColorField({ label, value, presets, onChange }: { label: string; value: string; presets: { name: string; value: string }[]; onChange: (value: string) => void }) { return <div className="report-color-field"><span>{label}</span><div className="report-color-control"><input aria-label={label} type="color" value={value} onChange={(event) => onChange(event.target.value)} /><code>{value.toUpperCase()}</code></div><div className="report-color-presets">{presets.map((preset) => <button type="button" key={`${preset.name}-${preset.value}`} style={{ background: preset.value }} title={preset.name} aria-label={`${label}: ${preset.name}`} onClick={() => onChange(preset.value)} className={value.toUpperCase() === preset.value ? 'selected' : ''} />)}</div></div> }
function StatPill({ label, value }: { label: string; value: string | number }) { return <div className="report-stat-pill"><span>{label}</span><strong>{value || value === 0 ? value : '—'}</strong></div> }
function distinct(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')) }
function matchesChoice(selected: string, values: string[]) { return selected === allLabel || values.some((value) => value.toLocaleLowerCase('es') === selected.toLocaleLowerCase('es')) }
function count(value?: number) { return Number(value || 0) }
function parseDate(value?: string | null): Date | null { if (!value) return null; const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/); if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])); const local = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (local) return new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1])); const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed }
function toIsoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function formatDate(value?: string | null) { const date = parseDate(value); return date ? new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : 'Sin fecha' }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1) }
function calculateHours(start?: string | null, end?: string | null) { if (!start || !end) return 0; const [startHour, startMinute] = start.split(':').map(Number); const [endHour, endMinute] = end.split(':').map(Number); if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return 0; let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute); if (minutes < 0) minutes += 1440; return Math.max(0, minutes / 60) }
function calculateStats(activities: ReportActivity[]) { const institutions = distinct(activities.flatMap((activity) => (activity.institutions || []).map((item) => item.name))); const spaces = [...(activities.flatMap((activity) => [...(activity.selected_spaces || []), activity.other_space || '']).filter(Boolean))]; const topSpace = Object.entries(spaces.reduce<Record<string, number>>((result, value) => ({ ...result, [value]: (result[value] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'; const institutionParticipants: Record<string, number> = {}; activities.forEach((activity) => (activity.institutions || []).forEach((institution) => { institutionParticipants[institution.name] = (institutionParticipants[institution.name] || 0) + count(activity.participants?.totalGeneral) })); const topInstitution = Object.entries(institutionParticipants).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'; return { activities: activities.length, institutions: institutions.length, participants: activities.reduce((sum, activity) => sum + count(activity.participants?.totalGeneral), 0), hours: activities.reduce((sum, activity) => sum + calculateHours(activity.hora_inicio, activity.hora_fin), 0), topSpace, topInstitution } }
function escapeHtml(value: unknown) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;') }
function safeUrl(value: string) { try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '' } catch { return '' } }

function buildReportHtml(config: { scope: Scope; presentation: Presentation; period: Period; options: typeof emptyOptions; reportColor: string; headerTextColor: string; frameColor: string; frameStyle: FrameStyle; specificMonth: number; specificYear: number; specificDate: string }, activities: ReportActivity[], stats: ReturnType<typeof calculateStats>, origin: string, attendancePages: AttendancePage[]) {
  const color = /^#[0-9a-f]{6}$/i.test(config.reportColor) ? config.reportColor : '#6650A4'
  const headerColor = /^#[0-9a-f]{6}$/i.test(config.headerTextColor) ? config.headerTextColor : '#FFFFFF'
  const frameColor = /^#[0-9a-f]{6}$/i.test(config.frameColor) ? config.frameColor : '#6650A4'
  const presentation = presentationOptions.find((item) => item.id === config.presentation)?.label || 'Resumen ejecutivo'
  const reportHeading = config.scope === 'INDIVIDUAL' && activities[0] ? activities[0].nombre_actividad : presentation
  const today = new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const table = (headers: string[], rows: string[][], className = '') => `<table${className ? ` class="${className}"` : ''}><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell).replaceAll('\n', '<br>')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}" class="empty-cell">Sin registros para mostrar</td></tr>`}</tbody></table>`
  const summary = `<section class="report-section"><h2>Enfoque del reporte</h2><p>${escapeHtml(presentationOptions.find((item) => item.id === config.presentation)?.description || '')}</p></section>`
  const statsTable = config.options.includeStats ? `<section class="report-section"><h2>Estadísticas</h2>${table(['Indicador', 'Valor'], [['Actividades', String(stats.activities)], ['Instituciones', String(stats.institutions)], ['Participantes', String(stats.participants)], ['Horas de uso del teatro', formatNumber(stats.hours)], ['Espacio más utilizado', stats.topSpace], ['Institución con mayor participación', stats.topInstitution]])}</section>` : ''
  const participantRows = (items: ReportActivity[]) => [['Docentes', String(items.reduce((sum, item) => sum + count(item.participants?.teachers), 0))], ['Estudiantes femeninos', String(items.reduce((sum, item) => sum + count(item.participants?.studentsF), 0))], ['Estudiantes masculinos', String(items.reduce((sum, item) => sum + count(item.participants?.studentsM), 0))], ['Comunidad', String(items.reduce((sum, item) => sum + count(item.participants?.community), 0))], ['Elenco / Artistas', String(items.reduce((sum, item) => sum + count(item.participants?.artists), 0))], ['Total general', String(items.reduce((sum, item) => sum + count(item.participants?.totalGeneral), 0))]]
  let specificSection = ''
  if (config.scope === 'INDIVIDUAL' && activities[0]) {
    const activity = activities[0]
    const detailRows = [['Nombre', activity.nombre_actividad], ['Código', activity.code || ''], ['Fecha', formatDate(activity.fecha)], ['Horario', `${activity.hora_inicio || '--:--'} - ${activity.hora_fin || '--:--'}`], ['Área de incidencia', activity.area_incidencia || ''], ['Tipo de actividad', activity.tipo_actividad || activity.otro_tipo_actividad || ''], ['Responsable', activity.responsible_name || ''], ['Instituciones', (activity.institutions || []).map((item) => `${item.name}${item.type ? ` (${item.type})` : ''}`).join('\n')], ['Espacios', [...(activity.selected_spaces || []), activity.other_space || ''].filter(Boolean).join(', ')]]
    const participationStats = [['Docentes', count(activity.participants?.teachers)], ['Estudiantes femeninos', count(activity.participants?.studentsF)], ['Estudiantes masculinos', count(activity.participants?.studentsM)], ['Comunidad', count(activity.participants?.community)], ['Elenco / Artistas', count(activity.participants?.artists)], ['Total general', count(activity.participants?.totalGeneral)]]
    const participationSection = config.options.includeParticipants ? `<section class="report-section keep-together"><h2>Estadísticas de participación</h2><div class="participant-grid">${participationStats.map(([label, value]) => `<div class="participant-card"><span>${escapeHtml(String(label))}</span><strong>${value}</strong></div>`).join('')}</div></section>` : ''
    const details = [['Antecedentes', activity.antecedentes], ['Objetivo', activity.objetivo], ['Descripción / logística', activity.descripcion], ...(config.options.includeObservations ? [['Evaluación y seguimiento', activity.evaluacion_seguimiento], ['Observaciones técnicas', activity.technical_info?.observations || activity.technical_info?.technicalNotes], ['Observación administrativa', activity.admin_observation]] : [])].filter((row) => Boolean(row[1]?.trim()))
    const inlinePhotos = config.options.includePhotos ? (activity.photo_urls || []).map((url) => safeUrl(url)).filter((url): url is string => Boolean(url)).slice(0, 4) : []
    const detailBlocks = details.map(([label, value]) => `<article class="detail-paragraph"><h3>${escapeHtml(label)}</h3><p>${escapeHtml(value)}</p></article>`)
    const infoRows: string[] = []
    const textRow = (left: string, right: string) => `<div class="info-row"><div>${left}</div><div>${right}</div></div>`
    const photoMarkup = (index: number) => `<figure class="photo-inline frame-${config.frameStyle.toLowerCase()}" style="--frame-color:${frameColor};--photo-index:${index};--rotation:${index % 2 ? '1.2deg' : '-1.2deg'}"><img src="${escapeHtml(inlinePhotos[index])}" alt="Fotografía de evidencia ${index + 1}"></figure>`
    let photoIndex = 0
    let detailIndex = 0
    while (detailIndex < detailBlocks.length || photoIndex < inlinePhotos.length) {
      if (photoIndex < inlinePhotos.length) {
        const detail = detailBlocks[detailIndex++] || ''
        const photo = photoMarkup(photoIndex)
        const photoOnLeft = photoIndex % 2 === 1
        infoRows.push(photoOnLeft ? textRow(photo, detail) : textRow(detail, photo))
        photoIndex += 1

        const detailsRemaining = detailBlocks.length - detailIndex
        const photosRemaining = inlinePhotos.length - photoIndex
        if (photoIndex % 2 === 0 && photosRemaining > 0 && detailsRemaining > photosRemaining) {
          const leftDetail = detailBlocks[detailIndex++] || ''
          const rightDetail = detailBlocks[detailIndex++] || ''
          infoRows.push(textRow(leftDetail, rightDetail))
        }
      } else {
        const leftDetail = detailBlocks[detailIndex++] || ''
        const rightDetail = detailBlocks[detailIndex++] || ''
        infoRows.push(textRow(leftDetail, rightDetail))
      }
    }
    const infoColumns = infoRows.length ? `<section class="report-section"><h2>Información de la actividad</h2><div class="info-grid">${infoRows.join('')}</div></section>` : ''
    specificSection = `${infoColumns}<section class="report-section"><h2>Detalle de actividad</h2>${table(['Campo', 'Valor'], detailRows.filter((row) => Boolean(row[1]?.trim())), 'details-table')}</section>${participationSection}`
  } else if (config.scope === 'BY_INSTITUTION') {
    const grouped: Record<string, ReportActivity[]> = {}; activities.forEach((activity) => (activity.institutions || []).forEach((institution) => { (grouped[institution.name] ||= []).push(activity) }))
    const rows = Object.entries(grouped).map(([name, group]) => [name, String(new Set(group.map((item) => item.id)).size), String(group.reduce((sum, item) => sum + count(item.participants?.totalGeneral), 0)), distinct(group.flatMap((item) => [...(item.selected_spaces || []), item.other_space || ''])).join(', ')])
    specificSection = `<section class="report-section"><h2>Gestión por institución</h2>${table(['Institución', 'Actividades', 'Participantes', 'Espacios'], rows)}</section>`
  } else if (config.scope === 'BY_SPACE') {
    const grouped: Record<string, ReportActivity[]> = {}; activities.forEach((activity) => [...(activity.selected_spaces || []), activity.other_space || ''].filter(Boolean).forEach((space) => { (grouped[space] ||= []).push(activity) }))
    const rows = Object.entries(grouped).map(([space, group]) => { const hours = group.reduce((sum, item) => sum + calculateHours(item.hora_inicio, item.hora_fin), 0); return [space, String(new Set(group.map((item) => item.id)).size), formatNumber(hours), `${Math.min(100, Math.round(hours / 108 * 100))}%`] })
    specificSection = `<section class="report-section"><h2>Uso de espacios</h2>${table(['Espacio', 'Actividades', 'Horas', 'Ocupación'], rows)}</section>`
  } else if (config.scope === 'STUDENT_GENDER') {
    specificSection = `<section class="report-section"><h2>Participantes</h2>${table(['Categoría', 'Cantidad'], participantRows(activities))}</section>`
  } else if (config.scope === 'STATISTICAL') {
    const grouped: Record<string, ReportActivity[]> = {}; activities.forEach((activity) => { const type = activity.tipo_actividad || activity.otro_tipo_actividad || 'Sin tipo'; (grouped[type] ||= []).push(activity) })
    specificSection = `<section class="report-section"><h2>Indicadores por tipo de actividad</h2>${table(['Tipo', 'Actividades', 'Participantes'], Object.entries(grouped).map(([type, group]) => [type, String(group.length), String(group.reduce((sum, item) => sum + count(item.participants?.totalGeneral), 0))]))}</section>`
  }
  const activityList = config.scope !== 'INDIVIDUAL' ? `<section class="report-section"><h2>Listado de actividades</h2>${table(['Fecha', 'Actividad', 'Institución', 'Espacio', 'Participantes'], activities.map((activity) => [formatDate(activity.fecha), activity.nombre_actividad, (activity.institutions || []).map((item) => item.name).join(', '), [...(activity.selected_spaces || []), activity.other_space || ''].filter(Boolean).join(', '), String(count(activity.participants?.totalGeneral))]))}</section>` : ''
  const photos = config.options.includePhotos ? activities.flatMap((activity) => (activity.photo_urls || []).filter((url) => safeUrl(url)).slice(0, 4).map((url) => ({ activity: activity.nombre_actividad, url: safeUrl(url) }))).slice(0, 20) : []
  const photosSection = config.scope !== 'INDIVIDUAL' && photos.length ? `<section class="report-section"><h2>Evidencias fotográficas</h2><div class="photo-grid">${photos.map((photo, index) => `<figure class="photo-frame frame-${config.frameStyle.toLowerCase()}" style="--frame-color:${frameColor};--photo-index:${index};--rotation:${index % 2 ? '1.2deg' : '-1.2deg'}"><img src="${escapeHtml(photo.url)}" alt="Fotografía de evidencia ${index + 1}"></figure>`).join('')}</div></section>` : ''
  const annexes = config.options.includeAnnexes ? activities.flatMap((activity) => (activity.other_annex_urls || []).filter((url) => safeUrl(url)).map(() => [activity.nombre_actividad, 'Documento anexo disponible en el expediente de la actividad'])) : []
  const annexSection = annexes.length ? `<section class="report-section"><h2>Documentos anexos</h2>${table(['Actividad', 'Documento'], annexes)}<p class="annex-note">Los archivos anexos no se incorporan a este informe.</p></section>` : ''
  const attendanceSection = attendancePages.length ? `<section class="attendance-section"><h2>Listas de asistencia</h2>${attendancePages.map((page) => `<div class="attendance-page"><img src="${escapeHtml(page.dataUrl)}" alt="Lista de asistencia de ${escapeHtml(page.activity)}"></div>`).join('')}</section>` : ''
  const headerLogo = origin ? `${origin}/logo-mined.png` : '/logo-mined.png'
  const name = `Reporte_TPT_${new Date().toISOString().slice(0, 10)}`
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(presentation)} - ${escapeHtml(name)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    @page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:10pt;line-height:1.4}.page-header{position:fixed;top:0;left:0;right:0;height:38mm;background:${color};color:${headerColor};display:grid;grid-template-columns:32% 42% 26%;align-items:center;padding:3mm 8mm;border-bottom:2mm solid ${headerColor}}.logo-box{height:31mm;display:flex;align-items:center;justify-content:center;border-right:1px solid ${headerColor}88;padding-right:5mm}.logo-box img{max-width:42mm;max-height:28mm;object-fit:contain;filter:brightness(0) saturate(100%) invert(100%)}.office{height:28mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;border-right:1px solid ${headerColor}88;padding:0 3mm;font-size:8pt}.office strong{font-size:9pt}.report-meta{text-align:center;padding-left:3mm;font-size:9pt;font-weight:700}.report-meta strong{display:block;font-size:14pt;margin-bottom:1mm}.page-footer{position:fixed;bottom:7mm;left:0;right:0;border-top:1px solid ${color};padding:2mm 0 0;display:flex;justify-content:space-between;color:#5d5668;font-size:8pt}.report-section{margin:0 0 8mm;break-inside:auto}.report-section h2{margin:0 0 3mm;padding:0 0 2mm;border-bottom:1px solid ${color};color:${color};font-size:12pt;text-transform:uppercase;break-after:avoid}.report-section h3{font-size:10pt;margin:0 0 1mm}.report-section p{margin:0 0 3mm;white-space:pre-wrap}.report-section table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5pt}.report-section thead{display:table-header-group}.report-section tr{break-inside:avoid;page-break-inside:avoid}.report-section th{background:${color};color:${headerColor};text-align:left;font-size:8pt}.report-section th,.report-section td{border:0.5px solid ${color};padding:2mm;vertical-align:top;overflow-wrap:anywhere}.report-section tbody tr:nth-child(odd){background:#f5f5f5}.detail-paragraph{margin:0 0 4mm;orphans:3;widows:3}.empty-cell{color:#777;text-align:center}.summary-line{font-size:9pt;margin-bottom:5mm}.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm 9mm}.photo-frame{position:relative;margin:0;padding:3mm;background:var(--frame-color, ${frameColor});border-radius:3mm;break-inside:avoid;box-shadow:0 1mm 2mm #0002;transform:none}.photo-frame img{width:100%;height:58mm;object-fit:cover;display:block;background:#eee;border:2mm solid #fff;border-radius:inherit}.photo-frame figcaption{padding:2mm 1mm 0;font-size:8pt}.photo-inline{margin:0;padding:2mm;border:2mm solid var(--frame-color, ${frameColor});border-radius:3mm;background:var(--frame-color, ${frameColor});box-shadow:0 1mm 2mm #0002;position:relative;break-inside:avoid;page-break-inside:avoid;text-align:center}.photo-inline img{display:block;width:100%;height:45mm;object-fit:contain;background:#fff;border:1mm solid #fff;border-radius:inherit}.photo-frame.frame-creative,.photo-inline.frame-creative,.photo-frame.frame-tape,.photo-inline.frame-tape{transform:rotate(var(--rotation,0deg))}.frame-rounded.photo-inline,.frame-rounded.photo-inline img{border-radius:7mm}.frame-minimal.photo-inline,.frame-minimal.photo-frame{background:#fff;border:0.5mm solid var(--frame-color, ${frameColor});padding:1mm;box-shadow:none}.frame-classic.photo-inline,.frame-classic.photo-frame{border-radius:0;box-shadow:none}.frame-polaroid.photo-inline,.frame-polaroid.photo-frame{background:#fff;border:1px solid #ddd;border-bottom:4mm solid var(--frame-color, ${frameColor});padding:2mm 2mm 5mm;border-radius:1mm}.frame-tape.photo-inline:before{content:'';display:block;position:absolute;top:-2mm;left:40%;width:20%;height:4mm;background:#f5e7beaa}.frame-creative:nth-child(4n+1){--rotation:-2deg}.frame-creative:nth-child(4n+2){--rotation:1.5deg}.frame-tape:nth-child(odd){--rotation:-1deg}.frame-tape:nth-child(even){--rotation:1deg}.frame-rounded,.frame-rounded img{border-radius:7mm}.frame-minimal{background:#fff;border:0.5mm solid var(--frame-color, ${frameColor});padding:1mm}.frame-classic{border-radius:0}.frame-polaroid{background:#fff;padding:3mm 3mm 8mm;border-radius:1mm}.frame-tape:before{content:'';display:block;position:absolute;top:-2mm;left:40%;width:20%;height:4mm;background:#f5e7beaa}.annex-note{font-size:8pt;color:#625b71;margin-top:2mm}.print-help{position:fixed;right:6mm;bottom:4mm;background:#6650a4;color:white;padding:2mm 4mm;border-radius:2mm;font-size:8pt}.report-title{font-size:13pt;font-weight:700;color:#1a1a1a;margin:0 0 2mm}.hide-print{display:none}@media screen{body{width:210mm;min-height:297mm;margin:12px auto;padding:43mm 14mm 28mm;background:#fff;box-shadow:0 3px 22px #0002}.page-header{position:absolute}.page-footer{position:absolute}.print-help{display:none}}@media print{body{width:auto;min-height:0}.report-section{orphans:3;widows:3}.report-section h2{break-after:avoid}}
    </style><style>
      .photo-frame img{width:100%;height:auto;max-height:58mm;object-fit:contain}
      .info-grid{display:block}
      .info-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7mm;margin-bottom:4mm;break-inside:avoid;page-break-inside:avoid}
      .detail-paragraph{padding:3mm;border:1px solid #e7e2f0;border-radius:2mm;background:#faf9fc;break-inside:avoid;page-break-inside:avoid}
      .detail-paragraph p{margin:0;overflow-wrap:anywhere}
      .photo-inline{margin:0;break-inside:avoid;page-break-inside:avoid;text-align:center}
      .photo-inline img{display:block;width:100%;height:45mm;object-fit:contain}
      .attendance-section{break-before:page;page-break-before:always;margin:0 0 8mm}
      .attendance-section>h2{margin:0 0 3mm;padding:0 0 2mm;border-bottom:1px solid ${color};color:${color};font-size:12pt;text-transform:uppercase;break-after:avoid}
      .attendance-page{min-height:210mm;display:flex;flex-direction:column;gap:3mm;break-inside:avoid;page-break-inside:avoid}
      .attendance-page+.attendance-page{break-before:page;page-break-before:always}
      .attendance-page>img{display:block;width:auto;height:auto;max-width:100%;max-height:210mm;object-fit:contain;align-self:center;margin:auto}
      .details-table th:first-child,.details-table td:first-child{width:34%}.details-table th:last-child,.details-table td:last-child{width:66%}
      .participant-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2mm}
      .participant-card{display:flex;align-items:center;justify-content:space-between;gap:2mm;min-height:14mm;padding:2mm 3mm;border:1px solid #e7e2f0;border-radius:2mm;background:#faf9fc;break-inside:avoid;page-break-inside:avoid}
      .participant-card span{font-size:8pt}.participant-card strong{color:${color};font-size:12pt}
      .keep-together{break-inside:avoid;page-break-inside:avoid}
      @media print{body{width:auto!important;min-height:0!important;margin:0!important;padding:0!important}.page-header{position:fixed!important;top:0!important;left:0!important;right:0!important}main{padding:43mm 14mm 16mm;-webkit-box-decoration-break:clone;box-decoration-break:clone}.attendance-page{min-height:210mm}.attendance-page>img{max-height:210mm}}
    </style></head><body><header class="page-header"><div class="logo-box"><img src="${escapeHtml(headerLogo)}" alt="Ministerio de Educación de El Salvador"></div><div class="office"><strong>DIRECCIÓN DE ADMINISTRACIÓN Y GESTIÓN TERRITORIAL</strong><span>Teatro del Ministerio de Educación,</span><span>Pablo Tesak</span></div><div class="report-meta"><strong>INFORME</strong><span>${today}</span></div></header><main><h1 class="report-title">${escapeHtml(reportHeading)}</h1>${config.options.includeStats && config.scope !== 'INDIVIDUAL' ? statsTable : ''}${config.scope !== 'INDIVIDUAL' ? summary : ''}${specificSection}${activityList}${photosSection}${annexSection}${attendanceSection}</main></body></html>`
}
