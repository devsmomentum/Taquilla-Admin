import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { useApp } from '@/contexts/AppContext'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Vault,
  ChartLine,
  Calendar,
  Target,
  Trophy,
  Users,
  ShieldCheck,
  Key,
  Buildings,
  SignOut,
  UserCircle,
  Gear
} from '@phosphor-icons/react'

// Items de navegación base - el path y label se ajustan según el tipo de usuario
const getNavItems = (currentUser: any) => {
  let comercializadorasPath = '/comercializadoras'
  let comercializadorasLabel = 'Comercializadoras'

  // Para comercializadoras, el link va directo a sus agencias
  if (currentUser?.userType === 'comercializadora') {
    comercializadorasPath = `/comercializadoras/${currentUser.id}/agencias`
    comercializadorasLabel = 'Mis Agencias'
  }

  // Para agencias, el link va directo a sus taquillas
  if (currentUser?.userType === 'agencia') {
    comercializadorasPath = `/comercializadoras/${currentUser.parentId}/agencias/${currentUser.id}/taquillas`
    comercializadorasLabel = 'Mis Taquillas'
  }

  return [
    { path: '/dashboard', label: 'Dashboard', icon: Vault, permission: 'dashboard' },
    { path: '/reports', label: 'Reportes', icon: ChartLine, permission: 'reports' },
    { path: '/lotteries', label: 'Sorteos', icon: Calendar, permission: 'lotteries' },
    { path: '/draws', label: 'Resultados', icon: Target, permission: 'draws.read' },
    { path: '/winners', label: 'Ganadores', icon: Trophy, permission: 'winners' },
    { path: '/users', label: 'Usuarios', icon: Users, permission: 'users' },
    { path: '/roles', label: 'Roles', icon: ShieldCheck, permission: 'roles' },
    { path: '/api-keys', label: 'API Keys', icon: Key, permission: 'api-keys' },
    { path: comercializadorasPath, label: comercializadorasLabel, icon: Buildings, permission: 'comercializadoras' },
    { path: '/settings', label: 'Configuración', icon: Gear, permission: 'settings' },
  ]
}

export function MainLayout() {
  const { currentUser, logout, canViewModule, updateUser } = useApp()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profilePassword, setProfilePassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const navigate = useNavigate()

  const handleLogout = () => {
    setLogoutDialogOpen(true)
  }

  const confirmLogout = async () => {
    await logout()
    setLogoutDialogOpen(false)
    toast.success('Sesión cerrada exitosamente')
    navigate('/login')
  }

  const openProfileDialog = () => {
    if (currentUser) {
      setProfileName(currentUser.name || '')
      setProfileEmail(currentUser.email || '')
      setProfilePassword('')
      setProfileErrors({})
      setProfileDialogOpen(true)
    }
  }

  const validateProfile = () => {
    const errors: Record<string, string> = {}
    if (!profileName.trim()) errors.name = 'El nombre es obligatorio'
    if (!profileEmail.trim()) {
      errors.email = 'El email es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail)) {
      errors.email = 'Email inválido'
    }
    if (profilePassword && profilePassword.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres'
    }
    setProfileErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validateProfile() || !currentUser) return

    setSavingProfile(true)
    try {
      const updates: any = {
        name: profileName,
        email: profileEmail
      }
      if (profilePassword) {
        updates.password = profilePassword
      }
      await updateUser(currentUser.id, updates)
      toast.success('Perfil actualizado exitosamente')
      setProfileDialogOpen(false)
    } catch (error) {
      toast.error('Error al actualizar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const navItems = getNavItems(currentUser)
  const visibleNavItems = navItems.filter(item => canViewModule(item.permission))

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      {/* Header Principal - Fijo */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Vault className="h-5 w-5 text-white" weight="bold" />
              </div>
              <h1 className="text-base md:text-lg font-bold tracking-tight">
                Gestión de Loterías
              </h1>
            </div>
            <button
              onClick={openProfileDialog}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Mi perfil"
            >
              <span className="text-sm font-medium text-slate-200 hidden sm:block max-w-[140px] truncate">
                {currentUser?.name}
              </span>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center border border-slate-500">
                <UserCircle className="h-5 w-5 text-slate-200" weight="fill" />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Subheader con Navegación */}
      <div className="sticky top-[60px] z-40 bg-background border-b shadow-sm">
        <div
          className="overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <nav className="flex min-w-max">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all border-b-2',
                      isActive
                        ? 'bg-primary/5 text-primary border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 md:py-6">
        <Outlet />
      </main>

      {/* Logout Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SignOut className="h-5 w-5 text-destructive" />
              Cerrar Sesión
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea cerrar sesión? Será redirigido a la pantalla de inicio de sesión.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)} className="cursor-pointer">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmLogout} className="gap-2 cursor-pointer">
              <SignOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" weight="fill" />
              Mi Perfil
            </DialogTitle>
            <DialogDescription>
              Actualiza tus datos personales. Deja la contraseña vacía para mantener la actual.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value)
                  if (profileErrors.name) setProfileErrors({ ...profileErrors, name: '' })
                }}
                placeholder="Tu nombre"
                className={profileErrors.name ? 'border-destructive' : ''}
                autoComplete="off"
              />
              {profileErrors.name && <p className="text-xs text-destructive">{profileErrors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileEmail}
                onChange={(e) => {
                  setProfileEmail(e.target.value)
                  if (profileErrors.email) setProfileErrors({ ...profileErrors, email: '' })
                }}
                placeholder="tu@email.com"
                className={profileErrors.email ? 'border-destructive' : ''}
                autoComplete="off"
              />
              {profileErrors.email && <p className="text-xs text-destructive">{profileErrors.email}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-password">Nueva Contraseña</Label>
              <Input
                id="profile-password"
                type="password"
                value={profilePassword}
                onChange={(e) => {
                  setProfilePassword(e.target.value)
                  if (profileErrors.password) setProfileErrors({ ...profileErrors, password: '' })
                }}
                placeholder="Dejar vacío para mantener la actual"
                className={profileErrors.password ? 'border-destructive' : ''}
                autoComplete="new-password"
              />
              {profileErrors.password && <p className="text-xs text-destructive">{profileErrors.password}</p>}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="gap-2 w-full sm:w-auto sm:mr-auto cursor-pointer"
            >
              <SignOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setProfileDialogOpen(false)} disabled={savingProfile} className="flex-1 sm:flex-none cursor-pointer">
                Cancelar
              </Button>
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2 flex-1 sm:flex-none cursor-pointer">
                {savingProfile ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
