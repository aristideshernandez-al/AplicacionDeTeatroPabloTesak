'use client'

import { Activity, Building2, CalendarDays, ClipboardList, FileBarChart, LayoutDashboard, LogOut, Settings, ShieldCheck, Users, X, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  active: string
  onNavChange: (item: string) => void
  userName: string
  userRole: string
  activityCount?: number
  onClose?: () => void
}

const navItems = [
  { label: 'Resumen', icon: LayoutDashboard, section: 'PRINCIPALES' },
  { label: 'Actividades', icon: ClipboardList, section: 'PRINCIPALES' },
  { label: 'Instituciones', icon: Building2, section: 'PRINCIPALES' },
  { label: 'Usuarios', icon: Users, section: 'PRINCIPALES' },
  { label: 'Reportes', icon: FileBarChart, section: 'PRINCIPALES' },
]

export function Sidebar({ active, onNavChange, userName, userRole, activityCount = 0, onClose }: SidebarProps) {
  const [showProfile, setShowProfile] = useState(false)

  return (
    <aside className="sidebar">
      <button className="close-button mobile-only" onClick={onClose} aria-label="Cerrar menú">
        <X size={20} />
      </button>

      <div className="brand">
        <span className="brand-mark">
          <img src="/icon.svg" alt="" width="22" height="22" />
        </span>
        <span>Control de Actividades</span>
      </div>

      <div className="workspace">
        <div className="avatar">
          <ShieldCheck size={16} />
        </div>
        <div>
          <strong>Teatro Pablo Tesak</strong>
          <span>Gestión institucional</span>
        </div>
        <ChevronDown size={15} />
      </div>

      <nav aria-label="Navegación principal">
        <p className="nav-label">MÓDULOS</p>
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`nav-item ${active === label ? 'active' : ''}`}
            onClick={() => {
              onNavChange(label)
              onClose?.()
            }}
          >
            <Icon size={18} />
            {label}
            {label === 'Actividades' && activityCount > 0 && (
              <span className="nav-count">{activityCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-item">
          <Settings size={18} />
          Configuración
        </button>

        <div className="help-card">
          <strong>Centro de ayuda</strong>
          <p>Administra el registro y seguimiento de las actividades del Teatro Pablo Tesak.</p>
          <button>Ver documentación</button>
        </div>

        <div className="profile-row" onClick={() => setShowProfile(!showProfile)}>
          <div className="avatar small">{userName.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{userName}</strong>
            <span>{userRole === 'ADMIN' ? 'Administrador' : 'Colaborador'}</span>
          </div>
          <button className="icon-button" aria-label="Opciones">
            <ChevronDown size={16} />
          </button>
        </div>

        {showProfile && (
          <div className="profile-menu">
            <button>
              <Settings size={14} />
              Editar perfil
            </button>
            <button>
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
