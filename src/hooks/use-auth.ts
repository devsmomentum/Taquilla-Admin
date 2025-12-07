import { User, Role, ModulePermission } from "@/lib/types"
import { useEffect, useState } from "react"

export function useAuth() {
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userPermissions, setUserPermissions] = useState<ModulePermission[]>([])

  useEffect(() => {
    if (currentUserId && users) {
      const user = users.find((u) => u.id === currentUserId)
      setCurrentUser(user || null)

      if (user && user.isActive && roles) {
        const userRoles = roles.filter((r) => user.roleIds.includes(r.id))
        const allPermissions = new Set<ModulePermission>()
        userRoles.forEach((role) => {
          role.permissions.forEach((perm) => allPermissions.add(perm))
        })
        setUserPermissions(Array.from(allPermissions))
      } else {
        setUserPermissions([])
      }
    } else {
      setCurrentUser(null)
      setUserPermissions([])
    }
  }, [currentUserId, users, roles])

  const hasPermission = (permission: ModulePermission): boolean => {
    return userPermissions.includes(permission)
  }

  const hasAnyPermission = (permissions: ModulePermission[]): boolean => {
    return permissions.some((perm) => userPermissions.includes(perm))
  }

  const hasAllPermissions = (permissions: ModulePermission[]): boolean => {
    return permissions.every((perm) => userPermissions.includes(perm))
  }

  return {
    currentUser,
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAuthenticated: !!currentUser,
  }
}
