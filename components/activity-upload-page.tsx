'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, FileUp, LoaderCircle, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ActivityAttachments, type ActivityAttachmentsValue } from '@/components/activity-attachments'

type ActivityUploadRecord = { nombre_actividad: string; photo_urls: string[] | null; attendance_list_urls: string[] | null; other_annex_urls: string[] | null }

export function ActivityUploadPage({ activityId }: { activityId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [activityName, setActivityName] = useState('')
  const [attachments, setAttachments] = useState<ActivityAttachmentsValue>({ photos: [], attendance: [], documents: [] })
  const [baseline, setBaseline] = useState<ActivityAttachmentsValue>({ photos: [], attendance: [], documents: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      if (!user) {
        const next = `${window.location.pathname}${window.location.search}`
        window.location.replace(`/auth/login?next=${encodeURIComponent(next)}`)
        return
      }
      const { data, error: queryError } = await supabase.from('activities').select('nombre_actividad,photo_urls,attendance_list_urls,other_annex_urls').eq('id', activityId).maybeSingle()
      if (!active) return
      if (queryError || !data) setError(queryError?.message || 'No encontramos esta actividad o tu cuenta no tiene acceso.')
      else {
        const activity = data as ActivityUploadRecord
        setActivityName(activity.nombre_actividad)
        const savedAttachments = { photos: activity.photo_urls || [], attendance: activity.attendance_list_urls || [], documents: activity.other_annex_urls || [] }
        setAttachments(savedAttachments)
        setBaseline(savedAttachments)
      }
      setLoading(false)
    })().catch(() => {
      if (!active) return
      setError('No pudimos abrir los datos de la actividad. Comprueba tu conexión e inténtalo otra vez.')
      setLoading(false)
    })
    return () => { active = false }
  }, [activityId, supabase])

  async function saveAttachments() {
    setSaving(true)
    setError('')
    setSaved(false)
    const { error: updateError } = await supabase.from('activities').update({
      photo_urls: attachments.photos,
      attendance_list_urls: attachments.attendance,
      other_annex_urls: attachments.documents,
    }).eq('id', activityId)
    setSaving(false)
    if (updateError) {
      setError(`No se guardaron los archivos: ${updateError.message}`)
      return
    }
    setBaseline(attachments)
    setSaved(true)
  }

  const hasChanges = JSON.stringify(attachments.documents) !== JSON.stringify(baseline.documents)

  if (loading) return <main className="mobile-upload-shell"><div className="mobile-upload-card upload-loading"><LoaderCircle className="upload-spinner" size={22} /><span>Abriendo la página de carga…</span></div></main>

  return <main className="mobile-upload-shell">
    <div className="mobile-upload-card">
      <header className="mobile-upload-header"><img src="/logo-teatro-pablo-tesak.png" alt="Teatro Pablo Tesak" /><span><ShieldCheck size={15} /> Carga segura de archivos</span></header>
      {error && !activityName ? <div className="mobile-upload-error" role="alert"><h1>No se pudo abrir la actividad</h1><p>{error}</p><a href="/">Ir al inicio</a></div> : <>
        <div className="mobile-upload-title"><p>ESCANEAR DOCUMENTO</p><h1>{activityName || 'Actividad'}</h1><span>Escanea con Google Drive y vuelve aquí para subir el documento a esta actividad.</span></div>
        <ol className="drive-scan-steps"><li>Abre Google Drive y toca <b>Cámara</b> para escanear.</li><li>Guarda el escaneo como PDF.</li><li>Vuelve a esta página, selecciona el PDF y pulsa «Terminar y subir documento».</li></ol>
        <a className="mobile-drive-link" href="https://drive.google.com/drive/" target="_blank" rel="noreferrer"><FileUp size={17} />Abrir Google Drive</a>
        <ActivityAttachments showPhoneQr={false} scannerOnly value={attachments} onChange={(next) => { setAttachments(next); setSaved(false) }} />
        {error && <p className="mobile-upload-error" role="alert">{error}</p>}
        {saved && <p className="mobile-upload-success" role="status"><CheckCircle2 size={17} />Documento subido correctamente. Ya puedes cerrar esta página; también aparecerá en la actividad abierta en la computadora.</p>}
        <div className="mobile-upload-actions"><a href={`/activities/${encodeURIComponent(activityId)}/edit`}>Volver a la actividad</a><button className="primary-button" type="button" onClick={saveAttachments} disabled={saving || !hasChanges}><FileUp size={16} />{saving ? 'Subiendo…' : 'Terminar y subir documento'}</button></div>
      </>}
    </div>
  </main>
}
