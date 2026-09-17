type AuthUserIdentity = {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

export function getActivityTechnicalIdentity(user: AuthUserIdentity, profileRole?: string | null) {
  const metadata = user.user_metadata || {}
  const fullName = [metadata.full_name, metadata.name, metadata.display_name]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
  const jobTitle = [metadata.job_title, metadata.cargo, metadata.position, metadata.title]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0)

  return {
    responsibleName: fullName?.trim() || user.email?.split('@')[0] || 'Colaborador',
    responsibleRole: jobTitle?.trim() || (profileRole === 'ADMIN' ? 'Administrador' : 'Colaborador'),
  }
}
