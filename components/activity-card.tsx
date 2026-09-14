'use client'

import { ClipboardList, Calendar, User, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ActivityCardProps {
  id: string
  code: string | null
  nombre_actividad: string
  tipo_actividad: string
  area_incidencia: string
  fecha: string | null
  responsible_name: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'
  onClick?: () => void
  compact?: boolean
}

const statusConfig = {
  APPROVED: { label: 'Aprobada', icon: CheckCircle2, color: 'green' },
  SUBMITTED: { label: 'En revisión', icon: Clock, color: 'orange' },
  REJECTED: { label: 'Rechazada', icon: AlertCircle, color: 'red' },
  DRAFT: { label: 'Borrador', icon: FileText, color: 'gray' },
  ARCHIVED: { label: 'Archivada', icon: FileText, color: 'slate' },
}

export function ActivityCard({
  id,
  code,
  nombre_actividad,
  tipo_actividad,
  area_incidencia,
  fecha,
  responsible_name,
  status,
  onClick,
  compact = false,
}: ActivityCardProps) {
  const statusInfo = statusConfig[status]
  const StatusIcon = statusInfo.icon

  if (compact) {
    return (
      <article className="activity-row" onClick={onClick}>
        <div className="activity-icon">
          <ClipboardList size={17} />
        </div>
        <div className="activity-info">
          <strong>{nombre_actividad}</strong>
          <span>
            {code || 'Sin código'} <b>·</b> {tipo_actividad || 'Sin tipo'}
          </span>
        </div>
        <div className="activity-owner">{responsible_name}</div>
        <span className={`status ${status.toLowerCase()}`}>{statusInfo.label}</span>
      </article>
    )
  }

  return (
    <article className="activity-card" onClick={onClick}>
      <div className="card-header">
        <div className="card-title">
          <h3>{nombre_actividad}</h3>
          <p>{area_incidencia}</p>
        </div>
        <span className={`status-badge ${status.toLowerCase()}`}>
          <StatusIcon size={14} />
          {statusInfo.label}
        </span>
      </div>

      <div className="card-meta">
        <div className="meta-item">
          <FileText size={14} />
          <span>{code || 'Sin código'}</span>
        </div>
        <div className="meta-item">
          <Calendar size={14} />
          <span>{fecha ? formatDate(fecha) : 'Sin fecha'}</span>
        </div>
      </div>

      <div className="card-details">
        <div className="detail">
          <span className="label">Tipo:</span>
          <span className="value">{tipo_actividad}</span>
        </div>
        <div className="detail">
          <span className="label">Responsable:</span>
          <span className="value">{responsible_name}</span>
        </div>
      </div>

      <button className="card-link" onClick={onClick}>
        Ver detalles →
      </button>
    </article>
  )
}
