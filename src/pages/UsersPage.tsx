import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserDialog } from '@/components/UserDialog'
import { useApp } from '@/contexts/AppContext'
import { User } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, PencilSimpleLine, X, MagnifyingGlass, Users, Warning, CheckCircle, XCircle, Envelope, CalendarBlank, ShieldCheck, Trash } from '@phosphor-icons/react'

export function UsersPage() {
  const {
    users,
    roles,
    currentUserId,
    createUser,
    updateUser,
    deleteUser
  } = useApp()

  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Solo mostrar usuarios con userType 'admin' o sin userType (para compatibilidad)
  // Excluir al usuario logueado de la lista
  const adminUsers = useMemo(() =>
    users.filter(u => (!u.userType || u.userType === 'admin') && u.id !== currentUserId),
    [users, currentUserId]
  )

  const filteredUsers = useMemo(() => {
    return adminUsers
      .filter(user => {
        const matchesSearch = search === '' ||
          user.name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase())

        const matchesStatus = statusFilter === 'all' ||
          (statusFilter === 'active' && user.isActive) ||
          (statusFilter === 'inactive' && !user.isActive)

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
  }, [adminUsers, search, statusFilter])

  const activeCount = adminUsers.filter(u => u.isActive).length
  const inactiveCount = adminUsers.filter(u => !u.isActive).length

  const handleSaveUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData)
        toast.success('Usuario actualizado exitosamente')
      } else {
        await createUser(userData)
        toast.success('Usuario creado exitosamente')
      }
      setEditingUser(undefined)
      return true
    } catch (error) {
      toast.error('Error al guardar usuario')
      return false
    }
  }

  const handleCreate = () => {
    setEditingUser(undefined)
    setUserDialogOpen(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setUserDialogOpen(true)
  }

  const handleDeleteClick = (user: User) => {
    if (user.id === currentUserId) {
      toast.error('No puede eliminar su propio usuario')
      return
    }
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    setIsDeleting(true)
    try {
      await deleteUser(userToDelete.id)
      toast.success('Usuario eliminado exitosamente')
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error) {
      toast.error('Error al eliminar usuario')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Comercializadores</h2>
          <p className="text-muted-foreground">
            Gestiona los comercializadores del sistema
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2 cursor-pointer">
          <Plus weight="bold" />
          Nuevo Comercializador
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="cursor-pointer"
          >
            Todos ({adminUsers.length})
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
            className={`cursor-pointer ${statusFilter === 'active' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            Activos ({activeCount})
          </Button>
          <Button
            variant={statusFilter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('inactive')}
            className={`cursor-pointer ${statusFilter === 'inactive' ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            Inactivos ({inactiveCount})
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredUsers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">
              {search || statusFilter !== 'all' ? 'No se encontraron comercializadores' : 'No hay comercializadores registrados'}
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              {search ? 'Intenta con otros criterios de búsqueda' : 'Crea tu primer comercializador para comenzar'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button onClick={handleCreate} variant="outline" className="gap-2 cursor-pointer">
                <Plus weight="bold" />
                Crear Primer Comercializador
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const userRoles = roles.filter((r) => user.roleIds.includes(r.id))
            return (
              <Card
                key={user.id}
                className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4"
                style={{
                  borderLeftColor: user.isActive ? 'rgb(16 185 129)' : 'rgb(156 163 175)'
                }}
              >
                <CardContent className="px-4 py-2">
                  {/* Header de la card */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                        user.isActive
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        <Users className="h-4 w-4 text-white" weight="fill" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm leading-tight">
                          {user.name}
                        </h3>
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                          className={`mt-0.5 text-[10px] px-1.5 py-0 h-4 ${
                            user.isActive
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : ''
                          }`}
                        >
                          {user.isActive ? (
                            <><CheckCircle weight="fill" className="mr-0.5 h-2.5 w-2.5" /> Activo</>
                          ) : (
                            <><XCircle weight="fill" className="mr-0.5 h-2.5 w-2.5" /> Inactivo</>
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        onClick={() => handleEdit(user)}
                        title="Editar"
                      >
                        <PencilSimpleLine className="h-4 w-4" />
                      </button>
                      <button
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        onClick={() => handleDeleteClick(user)}
                        title="Eliminar"
                      >
                        <X className="h-4 w-4" weight="bold" />
                      </button>
                    </div>
                  </div>

                  {/* Info de la card */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Envelope className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarBlank className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {user.createdAt
                          ? `Creado el ${format(new Date(user.createdAt), "d 'de' MMMM, yyyy", { locale: es })}`
                          : 'Sin fecha de creación'}
                      </span>
                    </div>

                    {/* Roles */}
                    <div className="pt-1.5 border-t mt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {userRoles.length > 0 ? (
                            <>
                              {userRoles.slice(0, 2).map((role) => (
                                <Badge key={role.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                  {role.name}
                                </Badge>
                              ))}
                              {userRoles.length > 2 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  +{userRoles.length - 2}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">Sin roles asignados</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <UserDialog
        open={userDialogOpen}
        onOpenChange={(open) => {
          setUserDialogOpen(open)
          if (!open) setEditingUser(undefined)
        }}
        user={editingUser}
        roles={roles}
        currentUserId={currentUserId}
        onSave={handleSaveUser}
      />

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Warning className="h-6 w-6 text-destructive" weight="fill" />
              </div>
              <div>
                <DialogTitle>Eliminar Usuario</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              ¿Está seguro que desea eliminar el usuario <span className="font-semibold text-foreground">"{userToDelete?.name}"</span>?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
