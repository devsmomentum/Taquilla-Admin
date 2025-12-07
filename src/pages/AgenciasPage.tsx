import { AgenciesTab } from '@/components/AgenciesTab'
import { useApp } from '@/contexts/AppContext'

export function AgenciasPage() {
  const {
    comercializadoras,
    visibleAgencies,
    agenciesLoading,
    updateUser,
    deleteUser,
    canViewModule,
    currentUser,
    createUser
  } = useApp()

  return (
    <AgenciesTab
      comercializadoras={comercializadoras}
      agencies={visibleAgencies}
      isLoading={agenciesLoading}
      onCreate={async () => true}
      onUpdate={async (id, updates) => {
        return await updateUser(id, {
          name: updates.name,
          address: updates.address,
          parentId: updates.parentId,
          shareOnSales: updates.shareOnSales,
          shareOnProfits: updates.shareOnProfits,
          isActive: updates.isActive
        })
      }}
      onDelete={async (id) => {
        return await deleteUser(id)
      }}
      canCreate={canViewModule("agencias")}
      currentUser={currentUser}
      createUser={createUser}
    />
  )
}
