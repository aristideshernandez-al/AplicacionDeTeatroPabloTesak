'use client'

import { useEffect, useMemo, useState } from 'react'
import { Camera, Download, FileText, ImagePlus, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'activity-attachments'
const MAX_FILE_SIZE = 20 * 1024 * 1024
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export type ActivityAttachmentsValue = {
  photos: string[]
  attendance: string[]
  documents: string[]
}

type Category = keyof ActivityAttachmentsValue

export function ActivityAttachments({ value, onChange, activityId, showPhoneQr = true, scannerOnly = false }: { value: ActivityAttachmentsValue; onChange: (value: ActivityAttachmentsValue) => void; activityId?: string; showPhoneQr?: boolean; scannerOnly?: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [uploading, setUploading] = useState<Category | null>(null)
  const [message, setMessage] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [creatingQr, setCreatingQr] = useState(false)
  const [nativeScannerUri, setNativeScannerUri] = useState('')
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const previewSignature = `${value.photos.join('|')}::${value.documents.join('|')}`

  useEffect(() => {
    let active = true
    const files = [...value.photos, ...value.documents]
    void Promise.all(files.map(async (file) => {
      if (file.startsWith('http://') || file.startsWith('https://')) return [file, file] as const
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(file, 3600)
      return [file, data?.signedUrl || ''] as const
    })).then((items) => { if (active) setPreviewUrls(Object.fromEntries(items)) }).catch(() => { if (active) setPreviewUrls({}) })
    return () => { active = false }
  }, [previewSignature, supabase, value.documents, value.photos])

  async function uploadFiles(category: Category, files: File[] | null) {
    if (!files?.length) return
    setUploading(category)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage('Inicia sesión antes de cargar archivos.')
      setUploading(null)
      return
    }

    const urls: string[] = []
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setMessage(`${file.name} supera el límite de 20 MB.`)
        continue
      }
      const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
      if (error) {
        setMessage(`No se pudo cargar ${file.name}: ${error.message}`)
        continue
      }
      urls.push(path)
    }
    if (urls.length) onChange({ ...value, [category]: [...value[category], ...urls] })
    setUploading(null)
  }

  async function removeFile(category: Category, url: string) {
    const marker = `/storage/v1/object/public/${BUCKET}/`
    const markerIndex = url.indexOf(marker)
    if (markerIndex >= 0 || !url.startsWith('http://') && !url.startsWith('https://')) {
      const path = markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : url
      const { error } = await supabase.storage.from(BUCKET).remove([path])
      if (error) {
        setMessage(`No se pudo quitar el archivo: ${error.message}`)
        return
      }
    }
    onChange({ ...value, [category]: value[category].filter((item) => item !== url) })
  }

  async function openFile(url: string) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    const tab = window.open('about:blank', '_blank')
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(url, 60)
    if (error || !data?.signedUrl) {
      tab?.close()
      setMessage(`No se pudo abrir el archivo: ${error?.message || 'enlace no disponible'}`)
      return
    }
    if (tab) tab.location.href = data.signedUrl
  }

  function fileName(url: string) {
    try { return decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'Archivo adjunto').replace(/^[0-9a-f-]{36}-/i, '') }
    catch { return 'Archivo adjunto' }
  }

  async function toggleScannerQr() {
    if (qrOpen) { setQrOpen(false); return }
    if (nativeScannerUri) { setQrOpen(true); return }
    setCreatingQr(true)
    setMessage('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inicia sesión para preparar el escaneo.')
      if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) throw new Error('Falta la configuración pública de Supabase.')
      const path = `${user.id}/${crypto.randomUUID()}-escaneo.pdf`
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
      if (error || !data?.signedUrl || !data.token) throw new Error(error ? `Supabase no autorizó la carga del documento: ${error.message}` : 'Supabase no devolvió un permiso de carga válido.')
      onChange({ ...value, documents: Array.from(new Set([...value.documents, path])) })
      const link = new URL('teatrotesakscanner://scan')
      link.searchParams.set('uploadUrl', data.signedUrl)
      link.searchParams.set('apiKey', SUPABASE_PUBLIC_KEY)
      link.searchParams.set('userId', user.id)
      setNativeScannerUri(link.toString())
      setQrOpen(true)
      if (!activityId) setMessage('QR listo. Al terminar el escaneo, guarda la actividad para conservar el documento adjunto.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo preparar el QR del escáner.')
    } finally { setCreatingQr(false) }
  }

  const scannerQr = nativeScannerUri && <div className="scanner-qr-card"><QRCodeSVG value={nativeScannerUri} size={190} level="M" marginSize={2} title="Código QR para abrir la aplicación Escáner Teatro" /><div><strong>Escáner Teatro Pablo Tesak</strong><p>Escanea con un teléfono Android que tenga instalada la aplicación. Se abrirá el escáner de documentos de Google y el PDF se subirá directamente a Supabase.</p><a href={activityId ? `/activities/${encodeURIComponent(activityId)}/upload` : undefined} target="_blank" rel="noreferrer">Usar el escáner web si no tienes la aplicación</a></div></div>
  const scanAction = showPhoneQr && <div className="scanner-actions"><a className="scanner-app-download" href="/descargas/escaner-teatro-pablo-tesak.apk" download><Download size={15} />Descargar app Android</a><button type="button" className="phone-qr-toggle" disabled={creatingQr} onClick={toggleScannerQr}>{creatingQr ? 'Preparando escáner…' : qrOpen ? 'Ocultar QR' : nativeScannerUri ? 'Mostrar QR del escáner Android' : 'Generar QR para Escáner Teatro'}</button>{qrOpen && scannerQr}<small>Instala la aplicación en el teléfono antes de escanear el QR.</small></div>

  return <section className={`activity-attachments form-wide ${scannerOnly ? 'scanner-only' : ''}`} id="activity-attachments" aria-label={scannerOnly ? 'Escanear y subir documento' : 'Fotografías y documentos'}>
    {!scannerOnly && <div className="attachments-intro"><div><strong>Fotografías y documentos</strong><span>Sube fotos desde tu computadora o escanea un documento con el teléfono.</span></div></div>}
    <div className="upload-groups">
      {!scannerOnly && <UploadGroup title="Fotos de evidencia" icon={<ImagePlus size={17} />} urls={value.photos} busy={Boolean(uploading)} accept="image/*" buttonLabel="Subir fotos desde este dispositivo" previewUrl={previewUrls} imagePreview fileName={fileName} onFiles={(files) => uploadFiles('photos', files)} onRemove={(url) => removeFile('photos', url)} onOpen={openFile} />}
      {!scannerOnly && <UploadGroup title="Listas de asistencia" icon={<FileText size={17} />} urls={value.attendance} busy={Boolean(uploading)} accept="application/pdf" buttonLabel="Subir listas en PDF" previewUrl={previewUrls} fileName={fileName} onFiles={(files) => uploadFiles('attendance', files)} onRemove={(url) => removeFile('attendance', url)} onOpen={openFile} />}
      <UploadGroup title={scannerOnly ? 'Escanea o selecciona el documento' : 'Escanear documento'} icon={<Camera size={17} />} urls={value.documents} busy={Boolean(uploading)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" capture="environment" buttonLabel={scannerOnly ? 'Seleccionar escaneo o PDF' : 'Subir documento desde este dispositivo'} previewUrl={previewUrls} fileName={fileName} onFiles={(files) => uploadFiles('documents', files)} onRemove={(url) => removeFile('documents', url)} onOpen={openFile} extra={scanAction} />
    </div>
    {message && <p className="upload-message" role="status">{message}</p>}
    {uploading && <p className="upload-progress" role="status"><LoaderCircle size={15} className="upload-spinner" />Cargando archivos…</p>}
  </section>
}

function UploadGroup({ title, icon, urls, busy, accept, capture, buttonLabel, onFiles, onRemove, onOpen, fileName, previewUrl, imagePreview = false, extra }: { title: string; icon: React.ReactNode; urls: string[]; busy: boolean; accept: string; capture?: 'environment'; buttonLabel: string; onFiles: (files: File[] | null) => void; onRemove: (url: string) => void; onOpen: (url: string) => void; fileName: (url: string) => string; previewUrl: Record<string, string>; imagePreview?: boolean; extra?: React.ReactNode }) {
  const inputId = `upload-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return <div className="upload-group">
    <div className="upload-group-heading">{icon}<strong>{title}</strong><span>{urls.length}</span></div>
    <label className="upload-button" htmlFor={inputId}><Upload size={15} />{buttonLabel}</label>
    <input id={inputId} className="visually-hidden-upload" type="file" accept={accept} capture={capture} multiple onChange={(event) => { onFiles(event.currentTarget.files ? Array.from(event.currentTarget.files) : null); event.currentTarget.value = '' }} disabled={busy} />
    {imagePreview && urls.length > 0 && <div className="uploaded-image-previews">{urls.map((url) => previewUrl[url] ? <button type="button" key={url} onClick={() => onOpen(url)} aria-label={`Ver ${fileName(url)}`}><img src={previewUrl[url]} alt={fileName(url)} loading="lazy" /></button> : null)}</div>}
    {urls.length > 0 && <ul className="uploaded-files">{urls.map((url) => <li key={url}><button type="button" className="uploaded-file-link" onClick={() => onOpen(url)}>{fileName(url)}</button><button type="button" onClick={() => onRemove(url)} aria-label={`Quitar ${fileName(url)}`}><Trash2 size={14} /></button></li>)}</ul>}
    {extra}
  </div>
}
