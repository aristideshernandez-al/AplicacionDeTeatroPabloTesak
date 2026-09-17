'use client'

import { useEffect, useMemo, useState } from 'react'
import { Camera, CheckCircle2, FileUp, LoaderCircle, ShieldCheck, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type ActivityAttachmentsValue } from '@/components/activity-attachments'

type ActivityUploadRecord = { nombre_actividad: string; photo_urls: string[] | null; attendance_list_urls: string[] | null; other_annex_urls: string[] | null }

let openCvPromise: Promise<any> | null = null

async function loadOpenCv() {
  if (!openCvPromise) openCvPromise = new Promise((resolve, reject) => {
    const finish = async () => {
      try {
        let cv: any = (window as any).cv
        if (typeof cv === 'function') cv = await cv()
        else if (cv instanceof Promise) cv = await cv
        if (!cv?.Mat) throw new Error('No se pudo iniciar el escáner.')
        ;(window as any).cv = cv
        resolve(cv)
      } catch (error) { reject(error) }
    }
    if ((window as any).cv) { void finish(); return }
    const script = document.createElement('script')
    script.src = '/vendor/opencv.js'
    script.async = true
    script.onload = () => { void finish() }
    script.onerror = () => reject(new Error('No se pudo cargar el escáner del navegador.'))
    document.head.appendChild(script)
  })
  return openCvPromise
}

async function correctDocumentPhoto(canvas: HTMLCanvasElement, blackAndWhite: boolean): Promise<{ blob: Blob; corrected: boolean }> {
  const cv = await loadOpenCv()
  const source = cv.imread(canvas)
  const gray = new cv.Mat()
  const blurred = new cv.Mat()
  const edges = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  let contour: any = null
  let approximation: any = null
  let transform: any = null
  let warped: any = null
  let processed: any = null
  let grayOutput: any = null
  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    cv.Canny(blurred, edges, 60, 180)
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)
    const candidates: Array<{ area: number; corners: Array<{ x: number; y: number }> }> = []
    for (let i = 0; i < contours.size(); i += 1) {
      contour = contours.get(i)
      const area = cv.contourArea(contour)
      if (area < source.cols * source.rows * 0.12) { contour.delete(); contour = null; continue }
      approximation = new cv.Mat()
      cv.approxPolyDP(contour, approximation, 0.02 * cv.arcLength(contour, true), true)
      if (approximation.rows === 4) {
        const corners = Array.from({ length: 4 }, (_, index) => ({ x: approximation.intAt(index, 0), y: approximation.intAt(index, 1) }))
        candidates.push({ area, corners })
      }
      approximation.delete(); approximation = null
      contour.delete(); contour = null
    }
    if (!candidates.length) {
      const raw = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo preparar la imagen.')), 'image/jpeg', 0.94))
      return { blob: raw, corrected: false }
    }
    const points = candidates.sort((a, b) => b.area - a.area)[0].corners
    const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y))
    const byDiff = [...points].sort((a, b) => a.x - a.y - (b.x - b.y))
    const [topLeft, bottomRight] = [bySum[0], bySum[3]]
    const topRight = byDiff[3]
    const bottomLeft = byDiff[0]
    const width = Math.max(Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y), Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y))
    const height = Math.max(Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y), Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y))
    if (!width || !height || !Number.isFinite(width + height)) {
      const raw = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo preparar la imagen.')), 'image/jpeg', 0.94))
      return { blob: raw, corrected: false }
    }
    const sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, [topLeft.x, topLeft.y, topRight.x, topRight.y, bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y])
    const destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height])
    transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints)
    warped = new cv.Mat()
    cv.warpPerspective(source, warped, transform, new cv.Size(Math.round(width), Math.round(height)), cv.INTER_CUBIC, cv.BORDER_REPLICATE, new cv.Scalar())
    sourcePoints.delete(); destinationPoints.delete()
    if (blackAndWhite) {
      grayOutput = new cv.Mat()
      processed = new cv.Mat()
      cv.cvtColor(warped, grayOutput, cv.COLOR_RGBA2GRAY)
      cv.adaptiveThreshold(grayOutput, processed, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 12)
    } else processed = warped
    const output = document.createElement('canvas')
    cv.imshow(output, processed)
    const blob = await new Promise<Blob>((resolve, reject) => output.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo preparar la imagen corregida.')), 'image/jpeg', 0.94))
    return { blob, corrected: true }
  } finally {
    source.delete(); gray.delete(); blurred.delete(); edges.delete(); contours.delete(); hierarchy.delete()
    contour?.delete(); approximation?.delete(); transform?.delete(); warped?.delete(); grayOutput?.delete()
    if (processed && processed !== warped) processed.delete()
  }
}

export function ActivityUploadPage({ activityId }: { activityId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [activityName, setActivityName] = useState('')
  const [attachments, setAttachments] = useState<ActivityAttachmentsValue>({ photos: [], attendance: [], documents: [] })
  const [baseline, setBaseline] = useState<ActivityAttachmentsValue>({ photos: [], attendance: [], documents: [] })
  const [scanFiles, setScanFiles] = useState<File[]>([])
  const [cameraOpen, setCameraOpen] = useState(true)
  const [cameraError, setCameraError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [processingScan, setProcessingScan] = useState(false)
  const [scanNotice, setScanNotice] = useState('')
  const [blackAndWhite, setBlackAndWhite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!cameraOpen || loading || !activityName) return
    let stream: MediaStream | null = null
    let cancelled = false
    const video = document.querySelector<HTMLVideoElement>('#document-scanner-video')
    setCameraReady(false)
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este navegador no permite abrir la cámara. Usa HTTPS o selecciona el documento escaneado.')
      return
    }
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } }, audio: false }).then((openedStream) => {
      if (cancelled) { openedStream.getTracks().forEach((track) => track.stop()); return }
      stream = openedStream
      if (video) { video.srcObject = openedStream; void video.play().then(() => setCameraReady(true)).catch(() => setCameraError('No se pudo iniciar la vista de cámara.')) }
    }).catch(() => setCameraError('No se pudo acceder a la cámara. Permite el acceso en el navegador e inténtalo otra vez.'))
    return () => { cancelled = true; stream?.getTracks().forEach((track) => track.stop()) }
  }, [cameraOpen, loading, activityName])

  async function capturePage() {
    const video = document.querySelector<HTMLVideoElement>('#document-scanner-video')
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    setProcessingScan(true)
    setScanNotice('Detectando y recortando el documento…')
    try {
      const result = await correctDocumentPhoto(canvas, blackAndWhite)
      setScanFiles((current) => [...current, new File([result.blob], `escaneo-${Date.now()}.jpg`, { type: 'image/jpeg' })])
      setScanNotice(result.corrected ? 'Página detectada, enderezada y añadida al escaneo.' : 'No se detectaron los bordes. Se añadió la imagen completa; puedes volver a capturarla con más contraste.')
      setSaved(false)
    } catch {
      canvas.toBlob((blob) => {
        if (blob) setScanFiles((current) => [...current, new File([blob], `escaneo-${Date.now()}.jpg`, { type: 'image/jpeg' })])
        setScanNotice('No se pudo aplicar el recorte automático; se añadió la imagen original.')
        setSaved(false)
      }, 'image/jpeg', 0.92)
    } finally {
      setProcessingScan(false)
    }
  }

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setError('Tu sesión terminó. Inicia sesión otra vez para subir el documento.'); return }
    const uploadedPaths: string[] = []
    for (const file of scanFiles) {
      if (file.size > 20 * 1024 * 1024) {
        if (uploadedPaths.length) await supabase.storage.from('activity-attachments').remove(uploadedPaths)
        setSaving(false)
        setError(`${file.name} supera el límite de 20 MB.`)
        return
      }
      const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('activity-attachments').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
      if (uploadError) {
        if (uploadedPaths.length) await supabase.storage.from('activity-attachments').remove(uploadedPaths)
        setSaving(false)
        setError(`No se pudo subir ${file.name}: ${uploadError.message}`)
        return
      }
      uploadedPaths.push(path)
    }
    const documents = [...attachments.documents, ...uploadedPaths]
    const { error: updateError } = await supabase.from('activities').update({
      photo_urls: attachments.photos,
      attendance_list_urls: attachments.attendance,
      other_annex_urls: documents,
    }).eq('id', activityId)
    setSaving(false)
    if (updateError) {
      if (uploadedPaths.length) await supabase.storage.from('activity-attachments').remove(uploadedPaths)
      setError(`No se guardaron los archivos: ${updateError.message}`)
      return
    }
    setAttachments((current) => ({ ...current, documents }))
    setBaseline((current) => ({ ...current, documents }))
    setScanFiles([])
    setSaved(true)
  }

  const hasChanges = scanFiles.length > 0 || JSON.stringify(attachments.documents) !== JSON.stringify(baseline.documents)

  if (loading) return <main className="mobile-upload-shell"><div className="mobile-upload-card upload-loading"><LoaderCircle className="upload-spinner" size={22} /><span>Abriendo la página de carga…</span></div></main>

  return <main className="mobile-upload-shell">
    <div className="mobile-upload-card">
      <header className="mobile-upload-header"><img src="/logo-teatro-pablo-tesak.png" alt="Teatro Pablo Tesak" /><span><ShieldCheck size={15} /> Carga segura de archivos</span></header>
      {error && !activityName ? <div className="mobile-upload-error" role="alert"><h1>No se pudo abrir la actividad</h1><p>{error}</p><a href="/">Ir al inicio</a></div> : <>
        <div className="mobile-upload-title"><p>ESCÁNER DE DOCUMENTOS</p><h1>{activityName || 'Actividad'}</h1><span>Detecta los bordes, endereza y mejora cada página aquí mismo. El archivo se sube directamente a esta actividad.</span></div>
        <section className="phone-scanner" aria-label="Escáner de documentos">
          {cameraOpen ? <div className="phone-camera-panel">
            <video id="document-scanner-video" autoPlay playsInline muted aria-label="Vista de la cámara para escanear" />
            {cameraError && <p className="mobile-upload-error" role="alert">{cameraError}</p>}
            <label className="scan-style">Mejora del escaneo<select value={blackAndWhite ? 'bw' : 'color'} onChange={(event) => setBlackAndWhite(event.target.value === 'bw')}><option value="color">Color mejorado</option><option value="bw">Blanco y negro</option></select></label>
            <div className="camera-controls"><button className="primary-button" type="button" onClick={capturePage} disabled={!cameraReady || processingScan}><Camera size={17} />{processingScan ? 'Procesando…' : 'Capturar y recortar página'}</button><button className="secondary-button" type="button" onClick={() => setCameraOpen(false)}><X size={17} />Cerrar cámara</button></div>
            {scanNotice && <p className="scan-notice" role="status">{scanNotice}</p>}
            {processingScan && <p className="scan-notice">La imagen se procesa en este teléfono antes de subirla.</p>}
            <small>Coloca el documento sobre una superficie plana y asegúrate de que se vean sus cuatro bordes.</small>
          </div> : <button className="primary-button scanner-start" type="button" onClick={() => setCameraOpen(true)}><Camera size={17} />Abrir escáner con la cámara</button>}
          <label className="upload-button phone-file-picker"><FileUp size={16} />Seleccionar un escaneo o PDF<input type="file" accept="image/*,.pdf" multiple onChange={(event) => { if (event.currentTarget.files) setScanFiles((current) => [...current, ...Array.from(event.currentTarget.files || [])]); event.currentTarget.value = ''; setSaved(false) }} /></label>
          {scanFiles.length > 0 && <ul className="phone-scan-list">{scanFiles.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" onClick={() => setScanFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Quitar ${file.name}`}><Trash2 size={15} /></button></li>)}</ul>}
          {attachments.documents.length > 0 && <p className="existing-scans">Documentos guardados: {attachments.documents.length}. El nuevo escaneo se añadirá a esta actividad.</p>}
        </section>
        {error && <p className="mobile-upload-error" role="alert">{error}</p>}
        {saved && <p className="mobile-upload-success" role="status"><CheckCircle2 size={17} />Documento subido a Supabase y guardado en esta actividad. Ya puedes cerrar esta página.</p>}
        <div className="mobile-upload-actions"><a href={`/activities/${encodeURIComponent(activityId)}/edit`}>Volver a la actividad</a><button className="primary-button" type="button" onClick={saveAttachments} disabled={saving || !hasChanges}><FileUp size={16} />{saving ? 'Subiendo…' : 'Terminar y subir documento'}</button></div>
      </>}
    </div>
  </main>
}
