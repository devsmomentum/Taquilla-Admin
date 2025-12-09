import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserDialog } from '@/components/UserDialog'
import { useApp } from '@/contexts/AppContext'
import { User } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, Trash, MagnifyingGlass, Users, Warning, CheckCircle, XCircle } from '@phosphor-icons/react'

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
    return adminUsers.filter(user => {
      const matchesSearch = search === '' ||
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive)

      return matchesSearch && matchesStatus
    })
  }, [adminUsers, search, statusFilter])

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

  const handleEditUser = (user: User) => {
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>
                Gestiona los usuarios administradores del sistema
              </CardDescription>
            </div>
            <Button onClick={() => { setEditingUser(undefined); setUserDialogOpen(true) }}>
              <Plus className="mr-2" weight="bold" />
              Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barra de búsqueda */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Estadísticas - Filtros clickeables */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="h-8"
              >
                Total: {adminUsers.length}
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={`h-8 ${statusFilter === 'active' ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-600 hover:bg-green-50'}`}
              >
                Activos: {adminUsers.filter(u => u.isActive).length}
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
                className={`h-8 ${statusFilter === 'inactive' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-600 hover:bg-red-50'}`}
              >
                Inactivos: {adminUsers.filter(u => !u.isActive).length}
              </Button>
            </div>

            {/* Tabla */}
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {search || statusFilter !== 'all' ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                </p>
                {!search && statusFilter === 'all' && (
                  <Button onClick={() => setUserDialogOpen(true)} variant="outline" className="mt-4">
                    <Plus className="mr-2" weight="bold" />
                    Crear Primer Usuario
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const userRoles = roles.filter((r) => user.roleIds.includes(r.id))
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <span className="font-medium">{user.name}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {userRoles.length > 0 ? userRoles.map((role) => (
                                <Badge key={role.id} variant="outline" className="text-xs">
                                  {role.name}
                                </Badge>
                              )) : (
                                <span className="text-muted-foreground text-sm">Sin roles</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.isActive ? (
                              <Badge variant="default" className="gap-1 bg-green-600">
                                <CheckCircle weight="fill" size={14} />
                                Activo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle weight="fill" size={14} />
                                Inactivo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy", { locale: es }) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(user)}
                                disabled={user.id === currentUserId}
                              >
                                <Trash size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <UserDialog
        open={userDialogOpen}
        onOpenChange={(open) => {
          setUserDialogOpen(open)
          if (!open) setEditingUser(undefined)
        }}
        user={editingUser}
        roles={roles}
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
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
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
