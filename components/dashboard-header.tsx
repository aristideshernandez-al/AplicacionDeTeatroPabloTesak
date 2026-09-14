'use client'

import { Bell, Menu, Search, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface DashboardHeaderProps {
  userName: string
  userRole: string
  onMenuToggle?: () => void
  onLogout?: () => void
}

export function DashboardHeader({ userName, userRole, onMenuToggle, onLogout }: DashboardHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenuToggle} aria-label="Abrir menú">
        <Menu size={20} />
      </button>

      <div className="breadcrumbs">
        <span>Teatro Pablo Tesak</span>
        <span>/</span>
        <strong>Panel de control</strong>
      </div>

      <div className="top-actions">
        <button className="icon-button" aria-label="Buscar">
          <Search size={18} />
        </button>

        <div className="notification-container">
          <button
            className="icon-button notification"
            aria-label="Notificaciones"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={18} />
            <i />
          </button>
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-item">
                <span>Nueva actividad registrada</span>
                <time>hace 5 min</time>
              </div>
              <div className="notification-item">
                <span>Actividad aprobada: "Taller de expresión"</span>
                <time>hace 2 horas</time>
              </div>
            </div>
          )}
        </div>

        <div className="user-menu">
          <div className="avatar small">{userName.charAt(0).toUpperCase()}</div>
          <div className="user-dropdown">
            <div className="user-info">
              <strong>{userName}</strong>
              <span>{userRole}</span>
            </div>
            <button className="text-button" onClick={onLogout}>
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
