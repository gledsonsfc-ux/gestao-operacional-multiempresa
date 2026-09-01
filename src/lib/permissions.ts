import { UserRole } from '@/types/gestao'

export interface RolePermissions {
  canApproveHorasExtras: boolean
  canApproveTrocas: boolean
  canEditColaboradores: boolean
  canEditPostos: boolean
  canEditEscalas: boolean
  canEditConfiguracoes: boolean
  canManageVT: boolean
  canManageUniformes: boolean
  canManualOverride: boolean
  canViewReports: boolean
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canApproveHorasExtras: true,
    canApproveTrocas: true,
    canEditColaboradores: true,
    canEditPostos: true,
    canEditEscalas: true,
    canEditConfiguracoes: true,
    canManageVT: true,
    canManageUniformes: true,
    canManualOverride: true,
    canViewReports: true,
  },
  coordenacao: {
    canApproveHorasExtras: true,
    canApproveTrocas: true,
    canEditColaboradores: true,
    canEditPostos: true,
    canEditEscalas: true,
    canEditConfiguracoes: false,
    canManageVT: true,
    canManageUniformes: true,
    canManualOverride: true,
    canViewReports: true,
  },
  supervisor: {
    canApproveHorasExtras: false,
    canApproveTrocas: false,
    canEditColaboradores: false,
    canEditPostos: false,
    canEditEscalas: false,
    canEditConfiguracoes: false,
    canManageVT: false,
    canManageUniformes: true,
    canManualOverride: false,
    canViewReports: true,
  },
  rh: {
    canApproveHorasExtras: true,
    canApproveTrocas: false,
    canEditColaboradores: true,
    canEditPostos: false,
    canEditEscalas: false,
    canEditConfiguracoes: false,
    canManageVT: true,
    canManageUniformes: true,
    canManualOverride: true,
    canViewReports: true,
  },
  consulta: {
    canApproveHorasExtras: false,
    canApproveTrocas: false,
    canEditColaboradores: false,
    canEditPostos: false,
    canEditEscalas: false,
    canEditConfiguracoes: false,
    canManageVT: false,
    canManageUniformes: false,
    canManualOverride: false,
    canViewReports: true,
  },
}

export const getPermissions = (role?: UserRole): RolePermissions => {
  if (!role) return ROLE_PERMISSIONS.consulta
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.consulta
}
