import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComercializadorasTab } from '@/components/ComercializadorasTab'
import { useApp } from '@/contexts/AppContext'
import { toast } from 'sonner'

export function ComercializadorasPage() {
  const {
    comercializadoras,
    comercializadorasLoading,
    createComercializadora,
    updateComercializadora,
    deleteComercializadora,
    currentUserId,
    currentUser,
    createUser,
    agencies
  } = useApp()

  const navigate = useNavigate()

  // Si el usuario es una comercializadora, redirigir directamente a sus agencias
  useEffect(() => {
    if (currentUser?.userType === 'comercializadora') {
      navigate(`/comercializadoras/${currentUser.id}/agencias`, { replace: true })
    }
    // Si el usuario es una agencia, redirigir directamente a sus taquillas
    if (currentUser?.userType === 'agencia') {
      navigate(`/comercializadoras/${currentUser.parentId}/agencias/${currentUser.id}/taquillas`, { replace: true })
    }
  }, [currentUser, navigate])

  // Si es comercializadora o agencia, no mostrar nada mientras se redirige
  if (currentUser?.userType === 'comercializadora' || currentUser?.userType === 'agencia') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ComercializadorasTab
      comercializadoras={comercializadoras}
      agencies={agencies}
      isLoading={comercializadorasLoading}
      onCreate={createComercializadora}
      onUpdate={updateComercializadora}
      onDelete={async (id) => {
        const success = await deleteComercializadora(id)
        if (!success) {
          toast.error('No se pudo eliminar la comercializadora')
        }
      }}
      currentUserId={currentUserId}
      createUser={createUser}
    />
  )
}
