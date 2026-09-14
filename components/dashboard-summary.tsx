'use client'

import { Activity, CheckCircle2, CalendarDays, Users, Building2, TrendingUp, ClipboardList, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ActivityStats {
  total: number
  approved: number
  submitted: number
  rejected: number
  draft: number
}

export function DashboardSummary() {
  const supabase = createClient()
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    approved: 0,
    submitted: 0,
    rejected: 0,
    draft: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const { data } = await supabase.from('activities').select('status')
      if (data) {
        const newStats: ActivityStats = {
          total: data.length,
          approved: data.filter((a) => a.status === 'APPROVED').length,
          submitted: data.filter((a) => a.status === 'SUBMITTED').length,
          rejected: data.filter((a) => a.status === 'REJECTED').length,
          draft: data.filter((a) => a.status === 'DRAFT').length,
        }
        setStats(newStats)
      }
      setLoading(false)
    }
    loadStats()
  }, [supabase])

  return (
    <div className="summary-container">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">SISTEMA DE CONTROL Y SEGUIMIENTO</p>
          <h1>Resumen general</h1>
          <p className="subtitle">
            Registra, organiza y da seguimiento a las actividades del Teatro Pablo Tesak.
          </p>
        </div>
        <button className="primary-button">
          <Activity size={18} />
          Nueva actividad
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card accent">
          <span className="stat-icon">
            <ClipboardList size={18} />
          </span>
          <div>
            <p>Actividades registradas</p>
            <strong>{stats.total}</strong>
          </div>
          <span className="stat-note">Este periodo</span>
        </div>

        <div className="stat-card">
          <span className="stat-icon violet">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <p>Actividades aprobadas</p>
            <strong>{stats.approved}</strong>
          </div>
          <span className="stat-note up">Seguimiento al día</span>
        </div>

        <div className="stat-card">
          <span className="stat-icon orange">
            <AlertCircle size={18} />
          </span>
          <div>
            <p>Pendientes de revisión</p>
            <strong>{stats.submitted}</strong>
          </div>
          <span className="stat-note">Requieren atención</span>
        </div>

        <div className="stat-card">
          <span className="stat-icon">
            <Users size={18} />
          </span>
          <div>
            <p>Colaboradores activos</p>
            <strong>12</strong>
          </div>
          <span className="stat-note">En el sistema</span>
        </div>

        <div className="stat-card">
          <span className="stat-icon">
            <Building2 size={18} />
          </span>
          <div>
            <p>Instituciones registradas</p>
            <strong>8</strong>
          </div>
          <span className="stat-note">Participantes</span>
        </div>

        <div className="stat-card">
          <span className="stat-icon">
            <TrendingUp size={18} />
          </span>
          <div>
            <p>Tasa de aprobación</p>
            <strong>{stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%</strong>
          </div>
          <span className="stat-note">Mes actual</span>
        </div>
      </div>
    </div>
  )
}
